import "server-only";
import { Prisma, PrismaClient, type Profile } from "@prisma/client";
import { normalisePooledUrl } from "@/lib/db-url";

/**
 * Database access.
 *
 * Two connections, and the difference matters:
 *
 *   DATABASE_URL      the owner role. Migrations and seed only. RLS does
 *                     not apply to a table's owner, so the app must never
 *                     run on this.
 *   APP_DATABASE_URL  the least-privilege `module_risk_app` role the app
 *                     runs on. RLS applies, and it cannot read anyone's
 *                     password hash.
 *
 * Every query the app makes goes through `withUser`, which opens a
 * transaction, states who is asking, and lets the policies do the rest.
 */

function makeClient() {
  return new PrismaClient({
    datasources: { db: { url: appDatabaseUrl() } },
    omit: { profile: { passwordHash: true } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** The client's own type, which carries the `omit` above. */
type DbClient = ReturnType<typeof makeClient>;

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: DbClient };

function appDatabaseUrl(): string {
  const appUrl = process.env.APP_DATABASE_URL;
  if (appUrl) return normalisePooledUrl(appUrl);

  // Falling back to the owner role silently would disable RLS — the exact
  // failure this setup exists to prevent. Loud in production, tolerated in
  // development with a warning.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_DATABASE_URL is not set. The app must connect as the module_risk_app role, " +
        "not as the database owner, or row level security does not apply. " +
        "See the README for the two connection strings.",
    );
  }

  const ownerUrl = process.env.DATABASE_URL;
  if (!ownerUrl) {
    throw new Error(
      "Neither APP_DATABASE_URL nor DATABASE_URL is set. Copy .env.example to .env.local.",
    );
  }
  console.warn(
    "\n[db] APP_DATABASE_URL is not set, falling back to DATABASE_URL.\n" +
      "[db] Row level security is NOT in force on that connection — the owner role bypasses it.\n",
  );
  return normalisePooledUrl(ownerUrl);
}

/**
 * A profile as the app ever sees it. `passwordHash` is omitted at the client
 * level below, which matches the column privileges: the app role has no
 * SELECT on that column, and Prisma's default "return every scalar field"
 * would otherwise make `profile.findUnique()` fail outright with
 * "permission denied for table profile".
 */
export type AppProfile = Omit<Profile, "passwordHash">;

export const db = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** The transaction client handed to a scoped callback. */
export type Tx = Omit<
  DbClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Run work as a given person, with row level security in force.
 *
 * `set_config(..., true)` is transaction-local, so the identity cannot leak
 * to the next request that borrows this pooled connection — which is the
 * whole reason this is a transaction rather than a plain SET.
 *
 * One transaction per request scope, not per query: a page render makes
 * several reads and they should all see the same snapshot anyway.
 */
export function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.user_id', ${userId}::text, true)`;
    return fn(tx);
  });
}

/**
 * Sign-in only. Reads the password hash through a SECURITY DEFINER function,
 * because the app role has no SELECT privilege on that column.
 */
export async function credentialsFor(email: string): Promise<{
  id: string;
  full_name: string;
  role: "assessor" | "manager" | "hs_lead";
  password_hash: string;
} | null> {
  const rows = await db.$queryRaw<
    { id: string; full_name: string; role: "assessor" | "manager" | "hs_lead"; password_hash: string }[]
  >`select * from auth_credentials(${email})`;
  return rows[0] ?? null;
}

/**
 * Postgres errors are translated rather than surfaced. A constraint name is
 * not an error message an assessor can act on.
 */
export function explainDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("signed off")) {
    return "This assessment is signed off, so it can no longer be edited. Create a revision to record a correction.";
  }
  if (message.includes("residual_not_worse")) {
    return "Residual risk cannot be higher than the initial risk. Check the two matrix selections.";
  }
  if (message.includes("revision is append-only")) {
    return "Revisions cannot be changed once written — that is what makes them the audit trail.";
  }
  if (message.includes("finding_assessment_id_hazard_id_key")) {
    return "That hazard is already on this assessment. Edit the existing finding instead of adding it twice.";
  }
  if (message.includes("hazard_label_category_key")) {
    return "That hazard is already in the library under this category. Search for it instead.";
  }
  if (message.includes("control_measure_label_key")) {
    return "That control is already in the library. Search for it instead.";
  }
  // An RLS policy that refuses a write surfaces as "no rows returned" on
  // update, or a violation on insert. Either way the cause is permission.
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2025" || error.code === "P2010")
  ) {
    return "You do not have permission to change this. Ask a centre manager or the H&S lead.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You do not have permission to change this. Ask a centre manager or the H&S lead.";
  }
  return "That could not be saved. Try again, and if it keeps failing tell whoever looks after this app.";
}
