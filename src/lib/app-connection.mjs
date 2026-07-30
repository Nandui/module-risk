/**
 * How the app's own database credentials come into being.
 *
 * The app must not run on the owner connection — row level security does not
 * apply to a table's owner, so every policy in the database would be silently
 * bypassed. It therefore runs as `module_risk_app`, which needs a password,
 * which is a secret, which normally means one more thing to configure by hand
 * and one more way to get a deployment subtly wrong.
 *
 * So it is derived instead. The app role's password is an HMAC keyed on the
 * OWNER role's password, which is already present in `DATABASE_URL` wherever
 * this app runs. That gives the same answer at build time and at run time
 * without either one storing it, and it does not weaken anything: whoever
 * holds the owner password already has unrestricted access to this database,
 * so a credential derived from it grants them nothing new. Deriving the
 * greater credential from the lesser would be the mistake; this is the other
 * way round.
 *
 * Set `APP_DATABASE_URL` explicitly and none of this is consulted.
 *
 * `AUTH_SECRET` is pointedly NOT derived the same way. It signs session
 * cookies, and keeping it independent of the database password means a leaked
 * database credential cannot also be used to forge sessions.
 *
 * Plain JavaScript, not TypeScript, because the Vercel build script and the
 * running app both need it and only one of them goes through a compiler.
 */
import { createHmac } from "node:crypto";

/** The least-privilege role the application runs as. Never the owner. */
export const APP_ROLE = "module_risk_app";

/**
 * Versioned so a future change to the scheme can be a new label rather than a
 * silent rotation nobody notices.
 */
const APP_PASSWORD_LABEL = "module-risk:app-role-password:v1";

/**
 * The owner password, which keys the derivation.
 *
 * Returns null when there is nothing to key on — an unparseable URL, or a
 * password-less local connection. Callers treat that as "cannot derive"
 * rather than deriving from something guessable.
 *
 * @param {string | undefined} ownerUrl
 * @returns {string | null}
 */
function ownerKey(ownerUrl) {
  if (!ownerUrl) return null;
  try {
    const password = decodeURIComponent(new URL(ownerUrl).password);
    return password.length > 0 ? password : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} label
 * @returns {string} 43 characters of base64url — URL-safe inside a connection
 *   string, and free of the quote characters that would need escaping in SQL.
 */
function derive(key, label) {
  return createHmac("sha256", key).update(label).digest("base64url");
}

/**
 * The password `module_risk_app` should have, given the owner connection.
 *
 * @param {string | undefined} ownerUrl
 * @returns {string | null}
 */
export function deriveAppPassword(ownerUrl) {
  const key = ownerKey(ownerUrl);
  return key === null ? null : derive(key, APP_PASSWORD_LABEL);
}

/**
 * The owner connection string with the app role's credentials swapped in.
 *
 * Host, database and query parameters are kept exactly as they are, so a
 * pooled owner URL yields a pooled app URL — which is what the running app
 * wants, and what `normalisePooledUrl` then adds `pgbouncer=true` to.
 *
 * @param {string | undefined} ownerUrl
 * @returns {string | null}
 */
export function deriveAppDatabaseUrl(ownerUrl) {
  const password = deriveAppPassword(ownerUrl);
  if (password === null || !ownerUrl) return null;
  try {
    const url = new URL(ownerUrl);
    url.username = APP_ROLE;
    url.password = password;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Fixes up a connection string the provider handed over.
 *
 * Two edits, both of which fail confusingly if left undone:
 *
 * - Behind a transaction pooler (Neon's `-pooler` host, PgBouncer, Supavisor)
 *   Prisma must stop caching prepared statements: each transaction can land
 *   on a different backend, where the cached statement will not be. The
 *   symptom is sporadic `prepared statement "s0" already exists` under load
 *   rather than a clean failure.
 * - `channel_binding` is a libpq option that Prisma's driver does not
 *   implement. Neon puts it on the strings it hands out. `sslmode` already
 *   gives TLS, so it is dropped.
 *
 * Done here rather than left to a hand-edited variable because the
 * Neon–Vercel integration manages `DATABASE_URL` itself: there is no edited
 * copy for the fix to live in.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalisePooledUrl(raw) {
  try {
    const url = new URL(raw);
    let changed = false;

    const pooled = /-pooler\./.test(url.hostname) || /pgbouncer/i.test(url.search);
    if (pooled && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
      changed = true;
    }

    if (url.searchParams.has("channel_binding")) {
      url.searchParams.delete("channel_binding");
      changed = true;
    }

    return changed ? url.toString() : raw;
  } catch {
    // Not a URL we can parse — hand it back and let the driver complain with
    // a better message than this function could.
    return raw;
  }
}
