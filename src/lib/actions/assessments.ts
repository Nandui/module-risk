"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSession, canSignOff } from "@/lib/data/session";
import {
  assessmentSchema,
  findingSchema,
  revisionSchema,
  signOffSchema,
} from "@/lib/schemas";
import { getAssessment } from "@/lib/data/assessments";

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

/**
 * Postgres errors are translated rather than surfaced. A constraint name is
 * not an error message an assessor can act on.
 */
function fromPostgres(message: string): string {
  if (message.includes("signed off")) {
    return "This assessment is signed off, so it can no longer be edited. Create a revision to record a correction.";
  }
  if (message.includes("residual_not_worse")) {
    return "Residual risk cannot be higher than the initial risk. Check the two matrix selections.";
  }
  if (message.includes("finding_assessment_id_hazard_id_key")) {
    return "That hazard is already on this assessment. Edit the existing finding instead of adding it twice.";
  }
  if (message.includes("row-level security") || message.includes("permission")) {
    return "You do not have permission to change this. Ask a centre manager or the H&S lead.";
  }
  return message;
}

// ---- create -------------------------------------------------------

export async function createAssessment(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = assessmentSchema.safeParse({
    centre_id: formData.get("centre_id"),
    template_id: formData.get("template_id") || undefined,
    title: formData.get("title"),
    scope_note: formData.get("scope_note"),
    review_frequency_months: formData.get("review_frequency_months"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment")
    .insert({
      centre_id: parsed.data.centre_id,
      template_id: parsed.data.template_id ?? null,
      title: parsed.data.title,
      scope_note: parsed.data.scope_note ?? null,
      review_frequency_months: parsed.data.review_frequency_months,
      status: "draft",
      assessor_id: session.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: fromPostgres(error?.message ?? "The assessment could not be created.") };
  }

  revalidatePath("/register");
  redirect(`/assessments/${data.id}/author`);
}

// ---- findings — autosaved, one at a time --------------------------

/**
 * Upsert one finding. Called by the authoring form's autosave, so it is
 * tolerant of being called repeatedly with the same payload and returns the
 * saved row's id for the client to hold on to.
 */
export async function saveFinding(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = findingSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const { id, ...values } = parsed.data;
  const supabase = await createClient();

  const payload = {
    assessment_id: values.assessment_id,
    hazard_id: values.hazard_id,
    likelihood: values.likelihood,
    severity: values.severity,
    control_measure_ids: values.control_measure_ids,
    residual_likelihood: values.residual_likelihood,
    residual_severity: values.residual_severity,
    persons_at_risk: values.persons_at_risk,
    notes: values.notes ?? null,
    photo_ids: values.photo_ids,
  };

  const { data, error } = id
    ? await supabase.from("finding").update(payload).eq("id", id).select("id").single()
    : await supabase.from("finding").insert(payload).select("id").single();

  if (error || !data) {
    return {
      ok: false,
      error: fromPostgres(error?.message ?? "The finding could not be saved."),
    };
  }

  revalidatePath(`/assessments/${values.assessment_id}/author`);
  revalidatePath("/register");
  return { ok: true, data: { id: data.id } };
}

export async function deleteFinding(id: string, assessmentId: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("finding").delete().eq("id", id);
  if (error) return { ok: false, error: fromPostgres(error.message) };

  revalidatePath(`/assessments/${assessmentId}/author`);
  revalidatePath("/register");
  return { ok: true };
}

// ---- status -------------------------------------------------------

export async function submitForReview(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const detail = await getAssessment(id);
  if (!detail) return { ok: false, error: "That assessment could not be found." };
  if (detail.findings.length === 0) {
    return {
      ok: false,
      error: "Add at least one finding before sending this for review.",
    };
  }

  const { error } = await supabase
    .from("assessment")
    .update({ status: "in_review" })
    .eq("id", id);
  if (error) return { ok: false, error: fromPostgres(error.message) };

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

  const detail = await getAssessment(parsed.data.id);
  if (!detail) return { ok: false, error: "That assessment could not be found." };
  if (detail.findings.length === 0) {
    return { ok: false, error: "An assessment with no findings cannot be signed off." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("assessment")
    .update({
      status: "signed_off",
      signed_off_at: now,
      signed_off_by: session.profile.id,
      reviewed_by: session.profile.id,
    })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: fromPostgres(error.message) };

  // The snapshot is written after sign-off so it captures the signed state —
  // this is the record an inspector is shown.
  await writeRevisionSnapshot(parsed.data.id, "Signed off", session.profile.id);

  revalidatePath("/register");
  revalidatePath("/reports");
  revalidatePath(`/assessments/${parsed.data.id}/author`);
  return { ok: true };
}

export async function archiveAssessment(id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!canSignOff(session.profile)) {
    return { ok: false, error: "Only a centre manager or the H&S lead can archive an assessment." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) return { ok: false, error: fromPostgres(error.message) };

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
    assessment_id: formData.get("assessment_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  if (!canSignOff(session.profile)) {
    return {
      ok: false,
      error: "Only a centre manager or the H&S lead can revise a signed-off assessment.",
    };
  }

  const written = await writeRevisionSnapshot(
    parsed.data.assessment_id,
    parsed.data.reason,
    session.profile.id,
  );
  if (!written.ok) return written;

  // Reopening clears the signature: the reopened document is not the record
  // that was signed. The snapshot above is.
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment")
    .update({ status: "draft", signed_off_at: null, signed_off_by: null })
    .eq("id", parsed.data.assessment_id);

  if (error) return { ok: false, error: fromPostgres(error.message) };

  revalidatePath("/register");
  revalidatePath(`/assessments/${parsed.data.assessment_id}/author`);
  return { ok: true };
}

async function writeRevisionSnapshot(
  assessmentId: string,
  reason: string,
  createdBy: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const [{ data: assessment }, { data: findings }, { data: last }] = await Promise.all([
    supabase.from("assessment").select("*").eq("id", assessmentId).maybeSingle(),
    supabase.from("finding").select("*").eq("assessment_id", assessmentId).order("sort_order"),
    supabase
      .from("revision")
      .select("revision_no")
      .eq("assessment_id", assessmentId)
      .order("revision_no", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!assessment) return { ok: false, error: "That assessment could not be found." };

  const { error } = await supabase.from("revision").insert({
    assessment_id: assessmentId,
    centre_id: assessment.centre_id,
    revision_no: (last?.revision_no ?? 0) + 1,
    snapshot: { assessment, findings: findings ?? [] },
    reason,
    created_by: createdBy,
  });

  if (error) return { ok: false, error: fromPostgres(error.message) };
  return { ok: true };
}
