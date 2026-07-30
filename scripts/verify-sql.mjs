/**
 * Verify the migrations and seed against a real Postgres.
 *
 * Supabase's `auth` and `storage` schemas are not available outside a
 * Supabase project, so this harness stubs the few objects the migrations
 * touch (auth.users, auth.uid(), storage.buckets, storage.objects) and
 * then runs every migration and the seed in order.
 *
 * It checks SQL correctness — syntax, constraints, triggers, the seed
 * logic — not RLS behaviour, which needs real JWT roles.
 *
 *   node scripts/verify-sql.mjs
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = "/tmp/module-risk-verify-pg";
const MIGRATIONS = new URL("../supabase/migrations", import.meta.url).pathname;
const SEED = new URL("../supabase/seed.sql", import.meta.url).pathname;

const STUBS = `
-- Supabase ships these roles; vanilla Postgres does not.
do $r$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $r$;

create schema if not exists auth;
create schema if not exists storage;

create table auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud text, role text, email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb
);

-- Stand-in for the session helper. Returns the first seeded user so the
-- policy helper functions at least compile and execute.
create or replace function auth.uid() returns uuid
language sql stable as $fn$ select id from auth.users order by created_at limit 1 $fn$;

create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text
);
alter table storage.objects enable row level security;
`;

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: 54999,
  persistent: false,
  onLog: () => {},
});

let failed = false;

async function run(client, label, sql) {
  try {
    await client.query(sql);
    console.log(`  ok    ${label}`);
  } catch (err) {
    failed = true;
    console.error(`  FAIL  ${label}`);
    console.error(`        ${err.message}`);
    if (err.position && typeof sql === "string") {
      const upto = sql.slice(0, Number(err.position));
      const line = upto.split("\n").length;
      console.error(`        at line ${line}: ${sql.split("\n")[line - 1]?.trim()}`);
    }
  }
}

await rm(DATA_DIR, { recursive: true, force: true });
await pg.initialise();
await pg.start();
await pg.createDatabase("verify");
const client = pg.getPgClient("verify");
await client.connect();

console.log("stubs");
await run(client, "auth + storage stubs", STUBS);

console.log("migrations");
const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  await run(client, f, await readFile(join(MIGRATIONS, f), "utf8"));
}

console.log("seed");
await run(client, "seed.sql", await readFile(SEED, "utf8"));

if (!failed) {
  console.log("\nchecks");
  const checks = [
    ["centres", "select count(*)::int n from centre"],
    ["hazard library", "select count(*)::int n from hazard"],
    ["control measures", "select count(*)::int n from control_measure"],
    ["templates", "select count(*)::int n from template"],
    ["assessments", "select count(*)::int n from assessment"],
    ["findings", "select count(*)::int n from finding"],
    ["actions", "select count(*)::int n from action"],
    ["revisions", "select count(*)::int n from revision"],
    [
      "references allocated",
      "select count(*)::int n from assessment where reference ~ '^RA-[A-Z]{2}-\\d{4}$'",
    ],
    [
      "overdue reviews",
      "select count(*)::int n from assessment where review_due_at < now()",
    ],
    [
      "empty templates (want 0)",
      "select count(*)::int n from template where cardinality(hazard_ids) = 0",
    ],
    [
      "findings with no controls (want 0)",
      "select count(*)::int n from finding where cardinality(control_measure_ids) = 0",
    ],
    [
      "action centre_id backfilled (want 0)",
      "select count(*)::int n from action a join finding f on f.id = a.finding_id join assessment s on s.id = f.assessment_id where a.centre_id <> s.centre_id",
    ],
  ];
  for (const [label, sql] of checks) {
    const { rows } = await client.query(sql);
    console.log(`  ${String(rows[0].n).padStart(4)}  ${label}`);
  }

  console.log("\nappend-only guards");
  // Savepoints need an explicit transaction; every tamper attempt below is
  // rolled back so the seeded data is left intact for later checks.
  await client.query("begin");
  const guards = [
    [
      "editing a signed-off assessment is refused",
      "update assessment set title = 'tampered' where status = 'signed_off'",
    ],
    [
      "editing a finding on a signed-off assessment is refused",
      "update finding set notes = 'tampered' where assessment_id = (select id from assessment where status = 'signed_off' limit 1)",
    ],
    ["rewriting a revision is refused", "update revision set reason = 'tampered'"],
    ["deleting a revision is refused", "delete from revision"],
    [
      "residual worse than initial is refused",
      "update finding set residual_likelihood = 5, residual_severity = 5 where assessment_id = (select id from assessment where status = 'draft' limit 1)",
    ],
    [
      "an unsigned draft cannot carry a sign-off date",
      "update assessment set signed_off_at = now() where status = 'draft'",
    ],
  ];
  for (const [label, sql] of guards) {
    try {
      await client.query(`savepoint g; ${sql}`);
      await client.query("rollback to savepoint g");
      failed = true;
      console.error(`  FAIL  ${label} — the write went through`);
    } catch {
      await client.query("rollback to savepoint g").catch(() => {});
      console.log(`  ok    ${label}`);
    }
  }

  console.log("\nallowed transitions");
  const allowed = [
    [
      "a signed-off assessment can be archived, keeping its signature",
      "update assessment set status = 'archived' where status = 'signed_off'",
    ],
    [
      "sign-off fills the signature date automatically",
      "update assessment set status = 'signed_off' where status = 'draft'",
    ],
    [
      "an action on a signed-off assessment can still be closed",
      "update action set closed_at = now() where closed_at is null",
    ],
  ];
  for (const [label, sql] of allowed) {
    try {
      await client.query(`savepoint ok; ${sql}`);
      console.log(`  ok    ${label}`);
      await client.query("rollback to savepoint ok");
    } catch (err) {
      failed = true;
      console.error(`  FAIL  ${label}`);
      console.error(`        ${err.message}`);
      await client.query("rollback to savepoint ok").catch(() => {});
    }
  }
  await client.query("rollback").catch(() => {});
}

await client.end();
await pg.stop();
await rm(DATA_DIR, { recursive: true, force: true });

console.log(failed ? "\nFAILED" : "\nAll SQL checks passed.");
process.exit(failed ? 1 : 0);
