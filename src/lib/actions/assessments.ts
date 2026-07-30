"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { explainDbError, withUser, type Tx } from "@/lib/db";
import { requireSession, canSignOff } from "@/lib/data/session";
import {
  assessmentSchema,
  findingSchema,
  revisionSchema,
  signOffSchema,
} from "@/lib/schemas";

export interface ActionResult {
  ok: boolean;
  /** A sentence saying what went wrong and how to fix it. Never vague. */
  error?: string;
  /** Field-level messages keyed by field name, for the form to place. */
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
}

function fromZod(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return {
    ok: false,
    error: "Some details need attention before this can be saved.",
    fieldErrors,
  };
}

// ---- create -------------------------------------------------------

export async function createAssessment(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = assessmentSchema.safeParse({
    centreId: formData.get("centreId"),
    templateId: formData.get("templateId") || undefined,
    title: formData.get("title"),
    scopeNote: formData.get("scopeNote"),
    reviewFrequencyMonths: formData.get("reviewFrequencyMonths"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  let id: string;
  try {
    const created = await withUser(session.profile.id, (tx) =>
      tx.assessment.create({
        data: {
          centreId: parsed.data.centreId,
          templateId: parsed.data.templateId ?? null,
          title: parsed.data.title,
          scopeNote: parsed.data.scopeNote ?? null,
          reviewFrequencyMonths: parsed.data.reviewFrequencyMonths,
          status: "draft",
          assessorId: session.profile.id,
        },
        select: { id: true },
      }),
    );
    id = created.id;
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/register");
  redirect(`/assessments/${id}/author`);
}

// ---- findings — autosaved, one at a time --------------------------

/**
 * Upsert one finding. Called by the authoring form's autosave, so it is
 * tolerant of being called repeatedly with the same payload and returns the
 * saved row's id for the client to hold on to.
 */
export async function saveFinding(input: unknown): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = findingSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { id, ...values } = parsed.data;

  const payload = {
    assessmentId: values.assessmentId,
    hazardId: values.hazardId,
    likelihood: values.likelihood,
    severity: values.severity,
    controlMeasureIds: values.controlMeasureIds,
    residualLikelihood: values.residualLikelihood,
    residualSeverity: values.residualSeverity,
    personsAtRisk: values.personsAtRisk,
    notes: values.notes ?? null,
    photoIds: values.photoIds,
  } satisfies Prisma.FindingUncheckedCreateInput;

  try {
    const saved = await withUser(session.profile.id, (tx) =>
      id
        ? tx.finding.update({ where: { id }, data: payload, select: { id: true } })
        : tx.finding.create({ data: payload, select: { id: true } }),
    );

    revalidatePath(`/assessments/${values.assessmentId}/author`);
    revalidatePath("/register");
    return { ok: true, data: { id: saved.id } };
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }
}

export async function deleteFinding(
  id: string,
  assessmentId: string,
): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withUser(session.profile.id, (tx) => tx.finding.delete({ where: { id } }));
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath(`/assessments/${assessmentId}/author`);
  revalidatePath("/register");
  return { ok: true };
}

// ---- status -------------------------------------------------------

export async function submitForReview(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    const result = await withUser(session.profile.id, async (tx) => {
      const findings = await tx.finding.count({ where: { assessmentId: id } });
      if (findings === 0) {
        return {
          ok: false,
          error: "Add at least one finding before sending this for review.",
        } satisfies ActionResult;
      }
      await tx.assessment.update({ where: { id }, data: { status: "in_review" } });
      return { ok: true } satisfies ActionResult;
    });
    if (!result.ok) return result;
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/register");
  revalidatePath(`/assessments/${id}/author`);
  return { ok: true };
}

/**
 * Sign off. A distinct, deliberate final step — the caller must pass the
 * explicit confirmation, and only a manager or the H&S lead may do it.
 *
 * After this, the record is immutable. The database enforces that too.
 */
export async function signOffAssessment(input: unknown): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = signOffSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  if (!canSignOff(session.profile)) {
    return {
      ok: false,
      error:
        "Only a centre manager or the H&S lead can sign off an assessment. Send it for review instead.",
    };
  }

  const { id } = parsed.data;

  try {
    const result = await withUser(session.profile.id, async (tx) => {
      const findings = await tx.finding.count({ where: { assessmentId: id } });
      if (findings === 0) {
        return {
          ok: false,
          error: "An assessment with no findings cannot be signed off.",
        } satisfies ActionResult;
      }

      await tx.assessment.update({
        where: { id },
        data: {
          status: "signed_off",
          signedOffAt: new Date(),
          signedOffById: session.profile.id,
          reviewedById: session.profile.id,
        },
      });

      // The snapshot is written inside the same transaction, after sign-off,
      // so it captures the signed state and cannot be orphaned by a failure
      // between the two writes.
      await writeRevisionSnapshot(tx, id, "Signed off", session.profile.id);
      return { ok: true } satisfies ActionResult;
    });
    if (!result.ok) return result;
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/register");
  revalidatePath("/reports");
  revalidatePath(`/assessments/${id}/author`);
  return { ok: true };
}

export async function archiveAssessment(id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!canSignOff(session.profile)) {
    return {
      ok: false,
      error: "Only a centre manager or the H&S lead can archive an assessment.",
    };
  }

  try {
    await withUser(session.profile.id, (tx) =>
      tx.assessment.update({ where: { id }, data: { status: "archived" } }),
    );
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/register");
  return { ok: true };
}

// ---- revisions ----------------------------------------------------

/**
 * A correction to a signed record. Snapshots the current state, then reopens
 * the document for editing — the previous state remains readable forever.
 */
export async function createRevision(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = revisionSchema.safeParse({
    assessmentId: formData.get("assessmentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  if (!canSignOff(session.profile)) {
    return {
      ok: false,
      error: "Only a centre manager or the H&S lead can revise a signed-off assessment.",
    };
  }

  const { assessmentId, reason } = parsed.data;

  try {
    await withUser(session.profile.id, async (tx) => {
      await writeRevisionSnapshot(tx, assessmentId, reason, session.profile.id);
      // Reopening clears the signature: the reopened document is not the
      // record that was signed. The snapshot above is.
      await tx.assessment.update({
        where: { id: assessmentId },
        data: { status: "draft", signedOffAt: null, signedOffById: null },
      });
    });
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/register");
  revalidatePath(`/assessments/${assessmentId}/author`);
  return { ok: true };
}

async function writeRevisionSnapshot(
  tx: Tx,
  assessmentId: string,
  reason: string,
  createdById: string,
): Promise<void> {
  const assessment = await tx.assessment.findUnique({
    where: { id: assessmentId },
    include: { findings: { orderBy: { sortOrder: "asc" } } },
  });
  if (!assessment) throw new Error("That assessment could not be found.");

  const last = await tx.revision.findFirst({
    where: { assessmentId },
    orderBy: { revisionNo: "desc" },
    select: { revisionNo: true },
  });

  const { findings, ...rest } = assessment;

  await tx.revision.create({
    data: {
      assessmentId,
      centreId: assessment.centreId,
      revisionNo: (last?.revisionNo ?? 0) + 1,
      // Dates are serialised so the snapshot is plain JSON an inspector's
      // tooling can read in ten years without this codebase.
      snapshot: JSON.parse(JSON.stringify({ assessment: rest, findings })),
      reason,
      createdById,
    },
  });
}
