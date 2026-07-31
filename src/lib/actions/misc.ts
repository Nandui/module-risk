"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Route } from "next";
import { AuthError } from "next-auth";
import { signIn as authSignIn, signOut as authSignOut } from "@/lib/auth";
import { explainDbError, withUser } from "@/lib/db";
import { requireSession, isHsLead, CENTRE_COOKIE } from "@/lib/data/session";
import {
  actionSchema,
  closeActionSchema,
  controlProposalSchema,
  hazardProposalSchema,
  signInSchema,
} from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/assessments";

function fieldErrorsFrom(
  issues: { path: (string | number | symbol)[]; message: string }[],
) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

// ---- centre switcher ----------------------------------------------

/**
 * Persisted in a cookie rather than the URL: the selected centre follows the
 * person across every screen, which is what a duty manager working one site
 * all day expects.
 */
export async function setCentre(centreId: string): Promise<void> {
  await requireSession();
  const jar = await cookies();
  jar.set(CENTRE_COOKIE, centreId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

// ---- auth ---------------------------------------------------------

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const requested = String(formData.get("next") ?? "");
  // Only same-origin paths are honoured — a `next` of `//evil.example` or a
  // full URL is an open redirect.
  const safe =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/register";

  try {
    await authSignIn("credentials", { ...parsed.data, redirectTo: safe });
  } catch (error) {
    if (error instanceof AuthError) {
      // Deliberately does not distinguish "no such account" from "wrong
      // password" — that difference is an account-enumeration leak.
      return {
        ok: false,
        error: "That email and password do not match an account. Check both and try again.",
      };
    }
    // NEXT_REDIRECT on success: Auth.js signals the redirect by throwing.
    throw error;
  }

  return { ok: true };
}

/**
 * Development-only one-click sign-in.
 *
 * Three guards, because this is a credential bypass and hiding the button is
 * not a control:
 *
 *  1. It refuses outright unless NODE_ENV is development. A production build
 *     that somehow reached this code path throws rather than authenticating.
 *  2. The email must be one of the three seeded demo accounts. Without the
 *     allowlist this would be "sign in as anyone whose address you can guess".
 *  3. The password stays on the server. It is never sent to the client, so it
 *     cannot end up in the bundle even in development.
 *
 * Delete this function and its component when the demo accounts go.
 */
const DEV_ACCOUNTS = [
  "lead@example.com",
  "manager@example.com",
  "assessor@example.com",
] as const;

export async function devSignIn(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("devSignIn is available in development only.");
  }

  const email = String(formData.get("email") ?? "");
  if (!DEV_ACCOUNTS.includes(email as (typeof DEV_ACCOUNTS)[number])) {
    throw new Error(`devSignIn refused an account outside the demo set: ${email}`);
  }

  try {
    await authSignIn("credentials", {
      email,
      password: process.env.SEED_PASSWORD ?? "risk-demo-1234",
      redirectTo: "/register",
    });
  } catch (error) {
    // Success redirects by throwing NEXT_REDIRECT, so an AuthError here means
    // the demo accounts are genuinely absent. Thrown rather than returned: a
    // plain <form action> cannot carry a result back, and in development the
    // error overlay is the right place for this to land.
    if (error instanceof AuthError) {
      throw new Error(
        "The demo accounts are not in this database. Run `npm run db:local` to seed them.",
      );
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await authSignOut({ redirectTo: "/sign-in" as Route });
}

// ---- actions on findings ------------------------------------------

export async function createAction(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = actionSchema.safeParse({
    findingId: formData.get("findingId"),
    description: formData.get("description"),
    ownerId: formData.get("ownerId") || undefined,
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some details need attention before this can be saved.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    // centreId is required by the schema but overwritten by a BEFORE INSERT
    // trigger from the finding's assessment, so the caller can never set it
    // wrong. The placeholder below never reaches storage.
    await withUser(session.profile.id, (tx) =>
      tx.$executeRaw`
        insert into "action" ("id", "finding_id", "centre_id", "description", "owner_id", "due_at")
        values (
          gen_random_uuid(),
          ${parsed.data.findingId}::uuid,
          '00000000-0000-0000-0000-000000000000'::uuid,
          ${parsed.data.description},
          ${parsed.data.ownerId ?? null}::uuid,
          ${new Date(parsed.data.dueAt)}
        )`,
    );
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/actions");
  revalidatePath("/register");
  return { ok: true };
}

export async function closeAction(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = closeActionSchema.safeParse({
    id: formData.get("id"),
    closureNote: formData.get("closureNote"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await withUser(session.profile.id, (tx) =>
      tx.action.update({
        where: { id: parsed.data.id },
        data: {
          closedAt: new Date(),
          closedById: session.profile.id,
          closureNote: parsed.data.closureNote ?? null,
        },
      }),
    );
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/actions");
  revalidatePath("/reports");
  return { ok: true };
}

export async function reopenAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    await withUser(session.profile.id, (tx) =>
      tx.action.update({
        where: { id },
        data: { closedAt: null, closedById: null, closureNote: null },
      }),
    );
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/actions");
  return { ok: true };
}

// ---- library proposals --------------------------------------------

/**
 * "Add new" exists but is deliberate and slightly effortful: the entry lands
 * as pending_review and does not silently join the controlled vocabulary.
 */
export async function proposeHazard(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = hazardProposalSchema.safeParse({
    label: formData.get("label"),
    category: formData.get("category"),
    guidance: formData.get("guidance"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some details need attention before this can be proposed.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    const created = await withUser(session.profile.id, (tx) =>
      tx.hazard.create({
        data: {
          label: parsed.data.label,
          category: parsed.data.category,
          guidance: parsed.data.guidance,
          // The H&S lead's own additions are approved on the spot; everyone
          // else's wait for them.
          reviewState: isHsLead(session.profile) ? "approved" : "pending_review",
          createdById: session.profile.id,
        },
        select: { id: true, label: true, reviewState: true },
      }),
    );

    revalidatePath("/library");
    return {
      ok: true,
      data: {
        id: created.id,
        label: created.label,
        review_state: created.reviewState,
      },
    };
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }
}

export async function proposeControlMeasure(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = controlProposalSchema.safeParse({
    label: formData.get("label"),
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some details need attention before this can be proposed.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    const created = await withUser(session.profile.id, (tx) =>
      tx.controlMeasure.create({
        data: {
          label: parsed.data.label,
          category: parsed.data.category,
          reviewState: isHsLead(session.profile) ? "approved" : "pending_review",
          createdById: session.profile.id,
        },
        select: { id: true, label: true, reviewState: true },
      }),
    );

    revalidatePath("/library");
    return {
      ok: true,
      data: {
        id: created.id,
        label: created.label,
        review_state: created.reviewState,
      },
    };
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }
}

export async function reviewLibraryEntry(
  table: "hazard" | "control_measure",
  id: string,
  decision: "approved" | "rejected",
): Promise<ActionResult> {
  const session = await requireSession();
  if (!isHsLead(session.profile)) {
    return { ok: false, error: "Only the H&S lead can approve library additions." };
  }

  try {
    await withUser(session.profile.id, (tx) =>
      table === "hazard"
        ? tx.hazard.update({ where: { id }, data: { reviewState: decision } })
        : tx.controlMeasure.update({ where: { id }, data: { reviewState: decision } }),
    );
  } catch (error) {
    return { ok: false, error: explainDbError(error) };
  }

  revalidatePath("/library");
  return { ok: true };
}
