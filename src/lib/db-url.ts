/**
 * Connection-string handling, kept apart from the Prisma client so it stays
 * pure and testable — `db.ts` imports `server-only`, which makes it
 * unloadable outside Next.
 */

/**
 * Behind a transaction pooler (Neon's `-pooler` host, PgBouncer, Supavisor)
 * Prisma must stop caching prepared statements: each transaction can land on
 * a different backend, and the cached statement will not be there.
 *
 * The symptom is sporadic `prepared statement "s0" already exists` under load
 * rather than a clean failure, so the flag is added here rather than left to a
 * hand-edited connection string — particularly because the Neon–Vercel
 * integration manages `DATABASE_URL` itself and hands it over without one.
 */
export function normalisePooledUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const pooled = /-pooler\./.test(url.hostname) || /pgbouncer/i.test(url.search);
    if (pooled && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
      return url.toString();
    }
    return raw;
  } catch {
    // Not a URL we can parse — hand it back and let the driver complain
    // with a better message than this function could.
    return raw;
  }
}
