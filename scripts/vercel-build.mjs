/**
 * Vercel build step.
 *
 *   prisma generate → prisma migrate deploy → provision the app role → next build
 *
 * The build machine is the one place that already holds both the owner
 * connection and network access to the database, so it does the setup that
 * would otherwise need a laptop with the repo cloned and port 5432 open.
 *
 * Everything here is idempotent. It creates and grants; it never drops.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import pg from "pg";
import {
  APP_ROLE,
  deriveAppDatabaseUrl,
  normalisePooledUrl,
} from "../src/lib/app-connection.mjs";

const env = { ...process.env };

// Prisma's `directUrl` reads DIRECT_URL. Fall back to whatever the provider
// integration called the unpooled host — Neon manages DATABASE_URL itself and
// names the direct one DATABASE_URL_UNPOOLED.
if (!env.DIRECT_URL) {
  const unpooled =
    env.DATABASE_URL_UNPOOLED ??
    env.POSTGRES_URL_NON_POOLING ?? // Vercel Postgres / Supabase naming
    env.DATABASE_URL;
  if (unpooled) {
    env.DIRECT_URL = unpooled;
    console.log(
      `[build] DIRECT_URL was unset — using ${
        env.DATABASE_URL_UNPOOLED
          ? "DATABASE_URL_UNPOOLED"
          : env.POSTGRES_URL_NON_POOLING
            ? "POSTGRES_URL_NON_POOLING"
            : "DATABASE_URL (pooled — migrations may fail)"
      }`,
    );
  }
}

if (!env.DATABASE_URL) {
  fatal(
    "DATABASE_URL is not set. Migrations cannot run.\nSee docs/neon-and-vercel.md.",
  );
}

// Neon hands out strings with `channel_binding=require`, which Prisma's
// driver does not implement, and without `pgbouncer=true`, which it needs
// behind the pooler. The integration manages these variables, so the fix
// belongs here rather than in a hand-edited copy.
env.DATABASE_URL = normalisePooledUrl(env.DATABASE_URL);
env.DIRECT_URL = normalisePooledUrl(env.DIRECT_URL);

// The app must connect as module_risk_app, never as the owner: row level
// security does not apply to a table's owner, so running on the owner
// connection would silently bypass every policy in the database.
//
// Rather than make that a variable somebody has to compose correctly — the
// one mistake with no symptom — it is derived from the owner connection when
// unset, and the same derivation runs inside the app. See
// src/lib/app-connection.mjs.
let derivedApp = false;
if (!env.APP_DATABASE_URL) {
  const derived = deriveAppDatabaseUrl(env.DATABASE_URL);
  if (!derived) {
    fatal(
      "APP_DATABASE_URL is not set, and it could not be derived because\n" +
        "  DATABASE_URL carries no password.\n\n" +
        "  Either set APP_DATABASE_URL to the pooled host with user `module_risk_app`\n" +
        "  and a password of your choosing, or point DATABASE_URL at a connection\n" +
        `  string that includes the owner's password.\n\n` +
        "  See docs/neon-and-vercel.md.",
    );
  }
  env.APP_DATABASE_URL = derived;
  derivedApp = true;
}

// Auth.js signs session cookies with this. It is deliberately NOT derived:
// keeping it independent of the database password means a leaked database
// credential cannot also be used to forge sessions.
if (!env.AUTH_SECRET) {
  fatal(
    "AUTH_SECRET is not set. Auth.js cannot sign session cookies without it.\n\n" +
      "  Add it in Vercel → Settings → Environment Variables and redeploy. Here is\n" +
      "  a freshly generated value you can paste straight in:\n\n" +
      `      ${randomBytes(32).toString("base64")}\n\n` +
      "  It is the only variable this project needs you to set by hand.",
  );
}

function run(command, args) {
  console.log(`\n[build] ${command} ${args.join(" ")}`);
  execFileSync(command, args, { env, stdio: "inherit" });
}

function fatal(message) {
  console.error(`\n[build] ${message}\n`);
  process.exit(1);
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);

// ---- provision the application role --------------------------------
// The migration creates the role when the owner has CREATEROLE, but it cannot
// set a password (nothing secret belongs in a committed migration). The
// password lives in APP_DATABASE_URL, which only exists here — so this is
// where the two are reconciled. Rotating the Vercel variable and redeploying
// is therefore all a password change takes.
console.log(
  `\n[build] provisioning the application role (${
    derivedApp ? "derived from DATABASE_URL" : "from APP_DATABASE_URL"
  })`,
);

const appUrl = new URL(env.APP_DATABASE_URL);
const appRole = decodeURIComponent(appUrl.username);
const appPassword = decodeURIComponent(appUrl.password);

if (appRole !== APP_ROLE) {
  fatal(
    `APP_DATABASE_URL uses the role "${appRole}".\n\n` +
      `  It must be \`${APP_ROLE}\`. Pointing it at the owner role is the one\n` +
      "  configuration that disables row level security without any other symptom.",
  );
}
if (!appPassword) {
  fatal("APP_DATABASE_URL has no password. Include one — the build applies it to the role.");
}

const owner = new pg.Client({
  connectionString: env.DIRECT_URL,
  connectionTimeoutMillis: 20_000,
});
await owner.connect();

try {
  const { rows: existing } = await owner.query(
    "select 1 from pg_roles where rolname = 'module_risk_app'",
  );

  if (existing.length === 0) {
    try {
      await owner.query("create role module_risk_app login");
      console.log("[build]   role created");
    } catch (error) {
      fatal(
        `Could not create the module_risk_app role: ${error.message}\n\n` +
          "  This database's owner lacks CREATEROLE. Create the role in your\n" +
          "  provider's console (Neon: Roles → New role), then redeploy — this\n" +
          "  build will grant it everything else.",
      );
    }
  } else {
    console.log("[build]   role already exists");
  }

  try {
    await owner.query(
      `alter role module_risk_app with password '${appPassword.replace(/'/g, "''")}'`,
    );
    console.log(
      `[build]   password synced${derivedApp ? " (derived)" : " from APP_DATABASE_URL"}`,
    );
  } catch (error) {
    console.warn(
      `[build]   could not set the password (${error.message}) — assuming it is` +
        " already correct in your provider's console",
    );
  }

  // Idempotent, and re-applied every deploy so a role created by hand, or a
  // table added by a later migration, still ends up with exactly these rights.
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
  console.log("[build]   privileges granted (DML only, no read on password_hash)");

  // ---- first-run seed ---------------------------------------------
  // Only when there is nobody at all: without a profile there is no way to
  // sign in, and this is the only moment that condition can be true. It will
  // never fire again, so real data is never touched.
  const { rows: people } = await owner.query("select count(*)::int n from profile");
  if (people[0].n === 0) {
    console.log("[build]   no accounts yet — seeding");
    run("npx", ["tsx", "prisma/seed.ts"]);
  } else {
    console.log(`[build]   ${people[0].n} accounts already exist — not seeding`);
  }
} finally {
  await owner.end().catch(() => {});
}

// ---- prove RLS is on before shipping -------------------------------
// A deployment that enforces nothing looks exactly like one that works, so
// this is checked rather than assumed.
console.log("\n[build] verifying row level security");
const app = new pg.Client({
  connectionString: env.APP_DATABASE_URL,
  connectionTimeoutMillis: 20_000,
});
try {
  await app.connect();
} catch (error) {
  fatal(
    `Could not connect as ${APP_ROLE}: ${error.message}\n\n` +
      (derivedApp
        ? "  The password could not be applied to the role above, so the running app\n" +
          "  will not be able to connect either. Check that the database owner can\n" +
          "  ALTER ROLE, or set APP_DATABASE_URL explicitly."
        : "  Check the password in APP_DATABASE_URL."),
  );
}
try {
  await app.query("begin");
  const { rows } = await app.query("select count(*)::int n from assessment");
  await app.query("rollback");
  if (rows[0].n !== 0) {
    fatal(
      `An unidentified connection read ${rows[0].n} assessments. Row level\n` +
        "  security is NOT in force — APP_DATABASE_URL is probably pointing at a\n" +
        "  role that owns the tables. Refusing to deploy.",
    );
  }
  console.log("[build]   an unidentified connection reads nothing — RLS is in force");
} finally {
  await app.end().catch(() => {});
}

run("npx", ["next", "build"]);
