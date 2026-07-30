import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CentreRow, ProfileRow } from "@/lib/db/types";
import { ALL_CENTRES, CENTRE_COOKIE } from "@/lib/centre";

export { ALL_CENTRES, CENTRE_COOKIE };

export interface Session {
  profile: ProfileRow;
  centres: CentreRow[];
  /** null means the group-level view across every centre. */
  centreId: string | null;
  centre: CentreRow | null;
}

/**
 * The signed-in person, their centres, and which centre is selected.
 *
 * Cached per request so the shell, the page and any nested server component
 * share one round trip.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: centres }] = await Promise.all([
    supabase.from("profile").select("*").eq("id", user.id).single(),
    supabase.from("centre").select("*").order("name"),
  ]);

  if (!profile) return null;

  const list = centres ?? [];
  const jar = await cookies();
  const selected = jar.get(CENTRE_COOKIE)?.value;

  // An unknown or stale centre id falls back to the group view rather than
  // showing an empty register with no explanation.
  const centreId =
    selected && selected !== ALL_CENTRES && list.some((c) => c.id === selected)
      ? selected
      : null;

  return {
    profile,
    centres: list,
    centreId,
    centre: centreId ? (list.find((c) => c.id === centreId) ?? null) : null,
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/** Manager or H&S lead — may sign off and edit anyone's work. */
export function canSignOff(profile: ProfileRow): boolean {
  return profile.role === "manager" || profile.role === "hs_lead";
}

export function isHsLead(profile: ProfileRow): boolean {
  return profile.role === "hs_lead";
}
