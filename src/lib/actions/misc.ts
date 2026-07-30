"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSession, isHsLead, CENTRE_COOKIE } from "@/lib/data/session";
import {
  actionSchema,
  closeActionSchema,
  controlProposalSchema,
  hazardProposalSchema,
  signInSchema,
} from "@/lib/schemas";
import type { ActionResult } from "@/lib/actions/assessments";

function fieldErrorsFrom(issues: { path: (string | number | symbol)[]; message: string }[]) {
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately does not distinguish "no such account" from "wrong
    // password" — that difference is an account-enumeration leak.
    return {
      ok: false,
      error: "That email and password do not match an account. Check both and try again.",
    };
  }

  // Only same-origin paths are honoured — a `next` of `//evil.example` or a
  // full URL is an open redirect, so anything that is not a plain path falls
  // back to the register.
  const requested = String(formData.get("next") ?? "");
  const safe =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/register";
  redirect(safe as Route);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

// ---- actions on findings ------------------------------------------

export async function createAction(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const parsed = actionSchema.safeParse({
    finding_id: formData.get("finding_id"),
    description: formData.get("description"),
    owner_id: formData.get("owner_id") || undefined,
    due_at: formData.get("due_at"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some details need attention before this can be saved.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  // centre_id is omitted on purpose: a BEFORE INSERT trigger fills it from
  // the finding's assessment, so the caller can never set it wrong.
  const { error } = await supabase.from("action").insert({
    finding_id: parsed.data.finding_id,
    description: parsed.data.description,
    owner_id: parsed.data.owner_id ?? null,
    due_at: new Date(parsed.data.due_at).toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/actions");
  revalidatePath("/register");
  return { ok: true };
}

export async function closeAction(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = closeActionSchema.safeParse({
    id: formData.get("id"),
    closure_note: formData.get("closure_note"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("action")
    .update({
      closed_at: new Date().toISOString(),
      closed_by: session.profile.id,
      closure_note: parsed.data.closure_note ?? null,
    })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/actions");
  revalidatePath("/reports");
  return { ok: true };
}

export async function reopenAction(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("action")
    .update({ closed_at: null, closed_by: null, closure_note: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hazard")
    .insert({
      label: parsed.data.label,
      category: parsed.data.category,
      guidance: parsed.data.guidance,
      // The H&S lead's own additions are approved on the spot; everyone
      // else's wait for them.
      review_state: isHsLead(session.profile) ? "approved" : "pending_review",
      created_by: session.profile.id,
    })
    .select("id, label, review_state")
    .single();

  if (error) {
    if (error.message.includes("hazard_label_category_key")) {
      return {
        ok: false,
        error: "That hazard is already in the library under this category. Search for it instead.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/library");
  return { ok: true, data: { id: data.id, label: data.label, review_state: data.review_state } };
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("control_measure")
    .insert({
      label: parsed.data.label,
      category: parsed.data.category,
      review_state: isHsLead(session.profile) ? "approved" : "pending_review",
      created_by: session.profile.id,
    })
    .select("id, label, review_state")
    .single();

  if (error) {
    if (error.message.includes("control_measure_label_key")) {
      return {
        ok: false,
        error: "That control is already in the library. Search for it instead.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/library");
  return { ok: true, data: { id: data.id, label: data.label, review_state: data.review_state } };
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

  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ review_state: decision })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/library");
  return { ok: true };
}
