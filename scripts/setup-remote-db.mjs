/**
 * Prepare a managed Postgres (Neon, Vercel Postgres, anything) for this app.
 *
 *   DATABASE_URL=<owner, unpooled> node scripts/setup-remote-db.mjs
 *
 * Does, in order:
 *   1. checks what is already there, and refuses to touch a database that
 *      holds tables it does not recognise
 *   2. applies the migrations (which create the module_risk_app role)
 *   3. sets that role's password — the same one the app derives, unless
 *      APP_DB_PASSWORD is given
 *   4. seeds the libraries and, on an empty database, the sample assessments
 *   5. connects AS the app role and proves row level security is in force
 *   6. prints the connection strings to put in Vercel
 *
 * Additive only: it creates and inserts, and never drops or truncates. Safe to
 * re-run — the migrations are versioned and the seed upserts.
 */
import { execFileSync } from "node:child_process";
import pg from "pg";
import { APP_ROLE, deriveAppPassword } from "../src/lib/app-connection.mjs";

const OWNER_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL ?? OWNER_URL;

if (!OWNER_URL) {
  console.error(
    "DATABASE_URL is not set.\n\n" +
      "Use the OWNER role, on the DIRECT (unpooled) host — migrations need a\n" +
      "real session, which a transaction pooler will not give them.\n\n" +
      "  DATABASE_URL='postgresql://…@ep-xxx.region.aws.neon.tech/neondb?sslmode=require' \\\n" +
      "    node scripts/setup-remote-db.mjs\n",
  );
  process.exit(1);
}

// By default the app role's password is derived from the owner's, exactly as
// the running app derives it — so there is no secret to carry from here to
// Vercel, and APP_DATABASE_URL need not be set at all.
const APP_PASSWORD = process.env.APP_DB_PASSWORD ?? deriveAppPassword(OWNER_URL);
const supplied = Boolean(process.env.APP_DB_PASSWORD);

if (!APP_PASSWORD) {
  console.error(
    "\nDATABASE_URL has no password, so the app role's password cannot be\n" +
      "derived from it. Re-run with APP_DB_PASSWORD set to the password you\n" +
      "want module_risk_app to have, and put it in APP_DATABASE_URL.\n",
  );
  process.exit(1);
}

/** Our tables, so an unrelated database can be recognised and left alone. */
const OURS = new Set([
  "profile", "centre", "centre_member", "hazard", "control_measure",
  "template", "assessment", "finding", "action", "revision",
  "_prisma_migrations",
]);

function step(label) {
  console.log(`\n── ${label}`);
}

const owner = new pg.Client({ connectionString: DIRECT_URL, connectionTimeoutMillis: 20_000 });

try {
  await owner.connect();
} catch (error) {
  console.error(`\nCould not connect: ${error.message}\n`);
  console.error(
    "If this timed out, the machine you are running from cannot reach Postgres\n" +
      "on port 5432. Run this from somewhere that can, or allow egress to the\n" +
      "database host.\n",
  );
  process.exit(1);
}

step("Inspecting the database");
const { rows: whoRows } = await owner.query(
  "select current_database() db, current_user usr, version() ver",
);
const who = whoRows[0];
console.log(`   ${who.db} as ${who.usr}`);
console.log(`   ${who.ver.split(",")[0]}`);

const { rows: existing } = await owner.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by 1",
);
const names = existing.map((r) => r.table_name);
const foreign = names.filter((n) => !OURS.has(n));

if (foreign.length > 0) {
  console.error(
    `\nThis database already holds tables this app does not own:\n` +
      `  ${foreign.join(", ")}\n\n` +
      `Refusing to migrate into it. Use a separate database, or drop those\n` +
      `tables yourself if they are not wanted.\n`,
  );
  process.exit(1);
}
console.log(
  names.length === 0
    ? "   empty — a clean install"
    : `   already has ${names.length} of this app's tables — will migrate forward`,
);

step("Applying migrations");
execFileSync("npx", ["prisma", "migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: DIRECT_URL, DIRECT_URL },
  stdio: "inherit",
});

// The role itself is created by the migration, which tolerates a hosted
// Postgres that withholds CREATEROLE — so check rather than assume.
const { rows: roleRows } = await owner.query(
  "select 1 from pg_roles where rolname = 'module_risk_app'",
);
if (roleRows.length === 0) {
  console.error(
    "\n   The module_risk_app role does not exist. The migration could not\n" +
      "   create it, which means this database's owner lacks CREATEROLE.\n\n" +
      "   Create it in your provider's console (Neon: Roles → New role), then\n" +
      "   re-run this script with APP_DB_PASSWORD set to that role's password.\n" +
      "   The grants are at the end of prisma/migrations/*_guards_and_rls.\n",
  );
  process.exit(1);
}
// Idempotent, and the reason this runs here as well as in the migration: if
// the role had to be created by hand in a provider console, the migration's
// grant block was skipped and the role would have no privileges at all.
step("Granting the application role its privileges");
await owner.query(`
  grant usage on schema public to module_risk_app;
  grant select, insert, update, delete on all tables in schema public to module_risk_app;
  grant usage, select on all sequences in schema public to module_risk_app;
  revoke select on "profile" from module_risk_app;
  grant select ("id", "full_name", "email", "role", "is_active", "created_at")
    on "profile" to module_risk_app;
  grant execute on function auth_credentials(text) to module_risk_app;
  alter default privileges in schema public
    grant select, insert, update, delete on tables to module_risk_app;
  alter default privileges in schema public
    grant usage, select on sequences to module_risk_app;
`);
console.log("   DML only, and no read on profile.password_hash");

step("Setting the application role's password");
{
  try {
    await owner.query(
      `alter role ${APP_ROLE} with password '${APP_PASSWORD.replace(/'/g, "''")}'`,
    );
    console.log(
      supplied
        ? "   set to the supplied APP_DB_PASSWORD"
        : "   set to the value the app derives — nothing to copy anywhere",
    );
  } catch (error) {
    console.error(
      `\n   Could not set the password: ${error.message}\n\n` +
        "   This database's owner cannot ALTER ROLE. Set the password in your\n" +
        "   provider's console, then re-run with APP_DB_PASSWORD set to it.\n",
    );
    process.exit(1);
  }
}

step("Seeding");
execFileSync("npx", ["tsx", "prisma/seed.ts"], {
  env: { ...process.env, DATABASE_URL: DIRECT_URL, DIRECT_URL },
  stdio: "inherit",
});

// ---- prove RLS is actually on -------------------------------------
step("Checking row level security");

const appUrl = new URL(DIRECT_URL);
appUrl.username = APP_ROLE;
appUrl.password = APP_PASSWORD;

const app = new pg.Client({
  connectionString: appUrl.toString(),
  connectionTimeoutMillis: 20_000,
});
await app.connect();

let failures = 0;
const check = (label, pass, detail) => {
  if (pass) console.log(`   ok    ${label}`);
  else {
    failures++;
    console.error(`   FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

// Nobody: an unidentified connection must read nothing.
await app.query("begin");
const anon = await app.query("select count(*)::int n from assessment");
await app.query("rollback");
check("an unidentified connection reads nothing", anon.rows[0].n === 0, `read ${anon.rows[0].n}`);

// The H&S lead: reads the group.
const { rows: leadRows } = await owner.query(
  "select id from profile where role = 'hs_lead' limit 1",
);
if (leadRows[0]) {
  await app.query("begin");
  await app.query("select set_config('app.user_id', $1, true)", [leadRows[0].id]);
  const seen = await app.query("select count(*)::int n from assessment");
  await app.query("rollback");
  check(`the H&S lead reads the register (${seen.rows[0].n})`, seen.rows[0].n > 0);
}

// The password hash must be unreachable.
try {
  await app.query("select password_hash from profile limit 1");
  check("the app role cannot read a password hash", false, "the select succeeded");
} catch {
  check("the app role cannot read a password hash", true);
}

// No DDL.
try {
  await app.query("begin");
  await app.query("drop table revision");
  await app.query("rollback");
  check("the app role cannot drop a table", false, "the drop succeeded");
} catch {
  await app.query("rollback").catch(() => {});
  check("the app role cannot drop a table", true);
}

await app.end();
await owner.end();

// ---- what to put in Vercel ---------------------------------------
const pooled = process.env.POOLED_URL;
const appPooled = pooled ? new URL(pooled) : null;
if (appPooled) {
  appPooled.username = APP_ROLE;
  appPooled.password = APP_PASSWORD;
  // Prisma needs prepared statements off behind a transaction pooler.
  appPooled.searchParams.set("pgbouncer", "true");
}

console.log(`
${failures === 0 ? "Ready." : `FAILED — ${failures} check(s)`}

Set these in Vercel (Project → Settings → Environment Variables):

  DATABASE_URL       ${pooled ? maskUrl(pooled) : "<pooled owner URL>"}
  DIRECT_URL         ${maskUrl(DIRECT_URL)}
  APP_DATABASE_URL   ${appPooled ? maskUrl(appPooled.toString()) : "<optional — derived from DATABASE_URL when unset>"}
  AUTH_SECRET        <openssl rand -base64 32>   # the only one you must invent
  BLOB_READ_WRITE_TOKEN  <Storage → Blob → connect>
${
  supplied
    ? `
APP_DATABASE_URL is required here, because you supplied APP_DB_PASSWORD: the
app cannot derive a password it did not choose.`
    : `
APP_DATABASE_URL is OPTIONAL. The app derives exactly the connection above
from DATABASE_URL, so leaving it unset is fine — and is one fewer string to
get wrong. Set it only if you want the app on a different role or host.`
}
Whatever it is set to, it must NOT be the owner role: row level security does
not apply to a table's owner, so running the app on DATABASE_URL would
silently disable every policy.
`);

function maskUrl(value) {
  try {
    const u = new URL(value);
    // Plain ASCII: URL.toString() percent-encodes anything else.
    if (u.password) u.password = "PASSWORD";
    return decodeURIComponent(u.toString());
  } catch {
    return value;
  }
}

process.exit(failures > 0 ? 1 : 0);
