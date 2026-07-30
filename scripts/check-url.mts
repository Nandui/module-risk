/**
 * Asserts the connection-string handling in src/lib/app-connection.mjs.
 *
 * This is the code that decides what the app connects to and as whom, in an
 * environment nothing here can reach. Getting it wrong does not throw — it
 * connects as the owner, and every row level security policy stops applying
 * with no other symptom. So it is checked here instead.
 */
import {
  APP_ROLE,
  deriveAppDatabaseUrl,
  deriveAppPassword,
  normalisePooledUrl,
} from "../src/lib/app-connection.mjs";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok    ${label}`);
  else {
    failures++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---- pooled-URL normalisation -------------------------------------
const pooledCases: [string, string, boolean][] = [
  ["Neon pooled, no flag", "postgresql://a:b@ep-x-pooler.eu.aws.neon.tech/db?sslmode=require", true],
  ["Neon pooled, flag already present", "postgresql://a:b@ep-x-pooler.eu.aws.neon.tech/db?pgbouncer=true", true],
  ["Neon direct (unpooled) is left alone", "postgresql://a:b@ep-x.eu.aws.neon.tech/db?sslmode=require", false],
  ["local dev is left alone", "postgresql://postgres:postgres@127.0.0.1:55432/risk", false],
  ["unparseable input is handed back", "definitely-not-a-url", false],
];

for (const [label, input, wantFlag] of pooledCases) {
  const out = normalisePooledUrl(input);
  check(label, /[?&]pgbouncer=true/.test(out) === wantFlag, out);
}

// sslmode must survive the rewrite, or TLS quietly drops.
const kept = normalisePooledUrl("postgresql://a:b@ep-x-pooler.h/db?sslmode=require");
check("sslmode is preserved", /sslmode=require/.test(kept), kept);

// channel_binding is a libpq option Prisma's driver does not implement, and
// Neon puts it on every string it hands out.
const bound = normalisePooledUrl(
  "postgresql://a:b@ep-x-pooler.h/db?channel_binding=require&sslmode=require",
);
check("channel_binding is dropped", !/channel_binding/.test(bound), bound);
check("…and sslmode survives that too", /sslmode=require/.test(bound), bound);

// ---- deriving the app connection ----------------------------------
const OWNER = "postgresql://neondb_owner:npw@ep-x-pooler.eu.aws.neon.tech/neondb?sslmode=require";
const derived = deriveAppDatabaseUrl(OWNER);

check("an app URL is derived from the owner URL", derived !== null);

if (derived) {
  const url = new URL(derived);
  check("it connects as the app role, never the owner", url.username === APP_ROLE, url.username);
  check("host is unchanged", url.hostname === "ep-x-pooler.eu.aws.neon.tech", url.hostname);
  check("database is unchanged", url.pathname === "/neondb", url.pathname);
  check("query parameters survive", url.searchParams.get("sslmode") === "require", url.search);
  check(
    "the password is not the owner's",
    url.password.length > 0 && decodeURIComponent(url.password) !== "npw",
  );
  // If it needed percent-encoding, the string round-trips differently between
  // the build script and the app, and the app cannot connect.
  check(
    "the password needs no URL escaping",
    /^[A-Za-z0-9_-]+$/.test(url.password),
    url.password,
  );
  // The same value is quoted straight into `ALTER ROLE … PASSWORD '…'`.
  check("…and no SQL escaping", !/['\\]/.test(decodeURIComponent(url.password)));
}

// Determinism is the entire point: the build sets this password on the role
// and the running app has to arrive at the same one, separately.
check(
  "derivation is deterministic",
  deriveAppPassword(OWNER) === deriveAppPassword(OWNER),
);

// Same database, different owner password ⇒ different app password, or
// rotating the owner credential would not rotate this one.
check(
  "a different owner password gives a different app password",
  deriveAppPassword(OWNER) !==
    deriveAppPassword("postgresql://neondb_owner:other@ep-x-pooler.eu.aws.neon.tech/neondb"),
);

// Pooled and unpooled hosts are the same database. If these disagreed, a
// build that provisioned via the direct host would set a password the app —
// connecting via the pooler — could not use.
check(
  "pooled and unpooled hosts derive the same password",
  deriveAppPassword(OWNER) ===
    deriveAppPassword("postgresql://neondb_owner:npw@ep-x.eu.aws.neon.tech/neondb"),
);

// Nothing to key on must mean "cannot derive", not "derive from something
// guessable" — the caller then refuses to run rather than inventing a secret.
check("no password ⇒ no derivation", deriveAppPassword("postgresql://postgres@localhost/risk") === null);
check("no URL ⇒ no derivation", deriveAppPassword(undefined) === null);
check("unparseable URL ⇒ no derivation", deriveAppPassword("not-a-url") === null);

console.log(
  failures ? `\nFAILED — ${failures}` : "\nConnection-string handling is correct.",
);
process.exit(failures ? 1 : 0);
