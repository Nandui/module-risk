import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Centre } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db, withUser, type AppProfile, type Tx } from "@/lib/db";
import { ALL_CENTRES, CENTRE_COOKIE } from "@/lib/centre";

export { ALL_CENTRES, CENTRE_COOKIE };

export interface Session {
  profile: AppProfile;
  centres: Centre[];
  /** null means the group-level view across every centre. */
  centreId: string | null;
  centre: Centre | null;
}

/**
 * The signed-in person, their centres, and which centre is selected.
 *
 * The role is read from the database on every request rather than trusted
 * from the JWT: a demotion should take effect immediately, not whenever the
 * token happens to expire.
 *
 * Cached per request so the shell, the page and any nested server component
 * share one round trip.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [profile, centres] = await withUser(userId, async (tx) =>
    Promise.all([
      tx.profile.findUnique({ where: { id: userId } }),
      tx.centre.findMany({ orderBy: { name: "asc" } }),
    ]),
  );

  if (!profile || !profile.isActive) return null;

  const jar = await cookies();
  const selected = jar.get(CENTRE_COOKIE)?.value;

  // An unknown or stale centre id falls back to the group view rather than
  // showing an empty register with no explanation.
  const centreId =
    selected && selected !== ALL_CENTRES && centres.some((c) => c.id === selected)
      ? selected
      : null;

  return {
    profile,
    centres,
    centreId,
    centre: centreId ? (centres.find((c) => c.id === centreId) ?? null) : null,
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/**
 * Run a query as the signed-in person, with RLS in force. Redirects rather
 * than throwing when there is no session, so a page never renders an empty
 * shell for a signed-out visitor.
 */
export async function query<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in");
  return withUser(userId, fn);
}

/** Manager or H&S lead — may sign off and edit anyone's work. */
export function canSignOff(profile: AppProfile): boolean {
  return profile.role === "manager" || profile.role === "hs_lead";
}

export function isHsLead(profile: AppProfile): boolean {
  return profile.role === "hs_lead";
}

// `db` is re-exported so seed-adjacent scripts do not have to reach past
// this module for it. Application code should use `query` or `withUser`.
export { db };
export type { AppProfile };
