/**
 * Verify the migrations, the seed, the append-only guards and — now that
 * identity is a session variable rather than a Supabase JWT — row level
 * security itself, against a real Postgres.
 *
 *   npm run verify:db
 *
 * Starts a throwaway Postgres, applies the migrations with `prisma migrate
 * deploy`, runs the seed, then connects as the least-privilege
 * `module_risk_app` role and checks what each role can and cannot do.
 */
import EmbeddedPostgres from "embedded-postgres";
import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import pg from "pg";

const DATA_DIR = "/tmp/module-risk-verify-pg";
const PORT = 54999;
const OWNER_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/verify`;
const APP_URL = `postgresql://module_risk_app:app-pw@127.0.0.1:${PORT}/verify`;

let failures = 0;

function ok(label) {
  console.log(`  ok    ${label}`);
}
function fail(label, detail) {
  failures++;
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Asserts a statement is refused, and rolls back either way. */
async function refuses(client, label, sql, params = []) {
  try {
    await client.query("begin");
    await client.query(sql, params);
    await client.query("rollback");
    fail(label, "the write went through");
  } catch {
    await client.query("rollback").catch(() => {});
    ok(label);
  }
}

/** Asserts a statement succeeds, and rolls it back. */
async function allows(client, label, sql, params = []) {
  try {
    await client.query("begin");
    const result = await client.query(sql, params);
    await client.query("rollback");
    if (result.rowCount === 0 && /^update|^delete/i.test(sql.trim())) {
      // RLS makes a forbidden UPDATE match zero rows rather than error, so a
      // silent no-op is a failure when the write was supposed to land.
      fail(label, "matched 0 rows");
    } else {
      ok(label);
    }
  } catch (error) {
    await client.query("rollback").catch(() => {});
    fail(label, error.message);
  }
}

const pgServer = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: false,
  onLog: () => {},
});

await rm(DATA_DIR, { recursive: true, force: true });
await pgServer.initialise();
await pgServer.start();
await pgServer.createDatabase("verify");

const owner = new pg.Client({ connectionString: OWNER_URL });
await owner.connect();

try {
  console.log("migrations");
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: OWNER_URL, DIRECT_URL: OWNER_URL },
      stdio: "pipe",
    });
    ok("prisma migrate deploy");
  } catch (error) {
    const detail = [error.stdout?.toString(), error.stderr?.toString(), error.message]
      .filter(Boolean)
      .join("\n");
    fail("prisma migrate deploy", detail);
    throw error;
  }

  // The app role's password is set here rather than in the migration, so the
  // migration is safe to commit.
  await owner.query("alter role module_risk_app with password 'app-pw'");

  console.log("\nseed");
  try {
    execFileSync("npx", ["tsx", "prisma/seed.ts"], {
      env: { ...process.env, DATABASE_URL: OWNER_URL, DIRECT_URL: OWNER_URL },
      stdio: "pipe",
    });
    ok("seed");
  } catch (error) {
    fail("seed", error.stdout?.toString() ?? error.stderr?.toString() ?? error.message);
    throw error;
  }

  console.log("\ncontents");
  const counts = [
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
      "select count(*)::int n from assessment where reference ~ '^RA-[A-Z]{2}-[0-9]{4}$'",
    ],
    ["overdue reviews", "select count(*)::int n from assessment where review_due_at < now()"],
    [
      "empty templates (want 0)",
      "select count(*)::int n from template where cardinality(hazard_ids) = 0",
    ],
    [
      "findings with no controls (want 0)",
      "select count(*)::int n from finding where cardinality(control_measure_ids) = 0",
    ],
    [
      "action centre_id mismatched (want 0)",
      `select count(*)::int n from action a
         join finding f on f.id = a.finding_id
         join assessment s on s.id = f.assessment_id
        where a.centre_id <> s.centre_id`,
    ],
  ];
  for (const [label, sql] of counts) {
    const { rows } = await owner.query(sql);
    console.log(`  ${String(rows[0].n).padStart(4)}  ${label}`);
  }

  // The seeded register must exercise the whole ramp, or the design of the
  // register and the reports is never actually looked at under real data.
  const { rows: bands } = await owner.query(`
    select band, count(*)::int n from (
      select case
        when residual_likelihood * residual_severity <= 4  then 1
        when residual_likelihood * residual_severity <= 9  then 2
        when residual_likelihood * residual_severity <= 12 then 3
        when residual_likelihood * residual_severity <= 16 then 4
        else 5 end as band
      from finding
    ) b group by band order by band
  `);
  const covered = bands.map((r) => r.band);
  console.log(
    `        residual bands present: ${bands.map((r) => `${r.band}×${r.n}`).join(" ")}`,
  );
  if (covered.length >= 3) ok("the seeded register spans several risk bands");
  else fail("the seeded register spans several risk bands", `only band(s) ${covered.join(",")}`);

  // ---- ids for the RLS checks ------------------------------------
  const { rows: ids } = await owner.query(`
    select
      (select id from profile where email = 'lead@example.com')     as lead,
      (select id from profile where email = 'manager@example.com')  as manager,
      (select id from profile where email = 'assessor@example.com') as assessor,
      (select id from assessment where status = 'signed_off' limit 1) as signed,
      (select id from assessment where status = 'draft' limit 1)      as draft,
      -- The seed spreads assessments across assessors, so the draft's owner
      -- has to be looked up rather than assumed.
      (select assessor_id from assessment where status = 'draft' limit 1) as draft_owner,
      (select id from profile where role = 'assessor'
         and id <> (select assessor_id from assessment where status = 'draft' limit 1)
       limit 1) as other_assessor,
      (select id from centre where code = 'BT')                       as centre
  `);
  const id = ids[0];

  console.log("\nappend-only guards (owner connection, RLS bypassed)");
  await refuses(
    owner,
    "editing a signed-off assessment is refused",
    "update assessment set title = 'tampered' where status = 'signed_off'",
  );
  await refuses(
    owner,
    "editing a finding on a signed-off assessment is refused",
    "update finding set notes = 'tampered' where assessment_id = $1",
    [id.signed],
  );
  await refuses(owner, "rewriting a revision is refused", "update revision set reason = 'x'");
  await refuses(owner, "deleting a revision is refused", "delete from revision");
  await refuses(
    owner,
    "residual worse than initial is refused",
    "update finding set residual_likelihood = 5, residual_severity = 5 where assessment_id = $1",
    [id.draft],
  );
  await refuses(
    owner,
    "an unsigned draft cannot carry a sign-off date",
    "update assessment set signed_off_at = now() where status = 'draft'",
  );
  await allows(
    owner,
    "a signed-off assessment can be archived, keeping its signature",
    "update assessment set status = 'archived' where status = 'signed_off'",
  );
  await allows(
    owner,
    "an action on a signed-off assessment can still be closed",
    "update action set closed_at = now() where closed_at is null",
  );

  // ---- row level security ---------------------------------------
  const app = new pg.Client({ connectionString: APP_URL });
  await app.connect();

  /** Runs `fn` as a given person on the app connection. */
  const as = async (userId, fn) => {
    await app.query("begin");
    await app.query("select set_config('app.user_id', $1, true)", [userId]);
    try {
      return await fn();
    } finally {
      await app.query("rollback").catch(() => {});
    }
  };

  console.log("\nrow level security (app role — RLS in force)");

  // Nobody at all.
  await app.query("begin");
  await app.query("select set_config('app.user_id', '', true)");
  const anon = await app.query("select count(*)::int n from assessment");
  await app.query("rollback");
  if (anon.rows[0].n === 0) ok("an unidentified connection reads nothing");
  else fail("an unidentified connection reads nothing", `read ${anon.rows[0].n} rows`);

  // Reads: the whole group, for any signed-in person.
  await as(id.assessor, async () => {
    const { rows } = await app.query("select count(*)::int n from assessment");
    if (rows[0].n > 0) ok(`an assessor reads the whole register (${rows[0].n})`);
    else fail("an assessor reads the whole register", "read 0 rows");
  });

  // The password hash is unreachable from the app role.
  await as(id.lead, async () => {
    try {
      await app.query("select password_hash from profile limit 1");
      fail("the app role cannot read a password hash", "the select succeeded");
    } catch {
      ok("the app role cannot read a password hash");
    }
  });
  await as(id.lead, async () => {
    const { rows } = await app.query(
      "select * from auth_credentials('lead@example.com')",
    );
    if (rows[0]?.password_hash) ok("sign-in reads the hash through auth_credentials");
    else fail("sign-in reads the hash through auth_credentials", "no row");
  });

  // Writes: role-scoped.
  await as(id.draft_owner, async () => {
    const { rowCount } = await app.query(
      "update assessment set title = 'assessor edit' where id = $1",
      [id.draft],
    );
    if (rowCount === 1) ok("an assessor may edit their own draft");
    else fail("an assessor may edit their own draft", "matched 0 rows");
  });

  // The other half of the same policy, and the one that actually protects
  // anything: assessor_id = app_uid() OR is_manager().
  await as(id.other_assessor, async () => {
    const { rowCount } = await app.query(
      "update assessment set title = 'not mine' where id = $1",
      [id.draft],
    );
    if (rowCount === 0) ok("an assessor cannot edit another assessor's draft");
    else fail("an assessor cannot edit another assessor's draft", "the update landed");
  });

  await as(id.manager, async () => {
    const { rowCount } = await app.query(
      "update assessment set title = 'manager edit' where id = $1",
      [id.draft],
    );
    if (rowCount === 1) ok("a manager may edit anyone's draft");
    else fail("a manager may edit anyone's draft", "matched 0 rows");
  });

  await as(id.assessor, async () => {
    const { rowCount } = await app.query(
      "update assessment set title = 'assessor edit' where id = $1",
      [id.signed],
    );
    if (rowCount === 0) ok("an assessor cannot edit a signed-off assessment");
    else fail("an assessor cannot edit a signed-off assessment", "the update landed");
  });

  await as(id.assessor, async () => {
    try {
      await app.query(
        "insert into centre (id, name, code) values (gen_random_uuid(), 'Rogue', 'ZZ')",
      );
      fail("an assessor cannot create a centre", "the insert landed");
    } catch {
      ok("an assessor cannot create a centre");
    }
  });

  await as(id.lead, async () => {
    try {
      await app.query(
        "insert into centre (id, name, code) values (gen_random_uuid(), 'New site', 'ZZ')",
      );
      ok("the H&S lead can create a centre");
    } catch (error) {
      fail("the H&S lead can create a centre", error.message);
    }
  });

  // Library additions land as pending_review for anyone but the lead.
  await as(id.assessor, async () => {
    try {
      await app.query(
        `insert into hazard (id, label, category, review_state, created_by)
         values (gen_random_uuid(), 'Proposed by an assessor', 'Physical', 'approved', $1)`,
        [id.assessor],
      );
      fail("an assessor cannot self-approve a library addition", "the insert landed");
    } catch {
      ok("an assessor cannot self-approve a library addition");
    }
  });
  await as(id.assessor, async () => {
    try {
      await app.query(
        `insert into hazard (id, label, category, review_state, created_by)
         values (gen_random_uuid(), 'Proposed by an assessor', 'Physical', 'pending_review', $1)`,
        [id.assessor],
      );
      ok("an assessor may propose a library addition for review");
    } catch (error) {
      fail("an assessor may propose a library addition for review", error.message);
    }
  });

  // Revisions cannot be attributed to somebody else.
  await as(id.manager, async () => {
    try {
      await app.query(
        `insert into revision (id, assessment_id, centre_id, revision_no, snapshot, created_by)
         values (gen_random_uuid(), $1, $2, 99, '{}'::jsonb, $3)`,
        [id.signed, id.centre, id.lead],
      );
      fail("a revision cannot be attributed to someone else", "the insert landed");
    } catch {
      ok("a revision cannot be attributed to someone else");
    }
  });

  // The app role has no DDL.
  await as(id.lead, async () => {
    try {
      await app.query("drop table revision");
      fail("the app role cannot drop a table", "the drop succeeded");
    } catch {
      ok("the app role cannot drop a table");
    }
  });
  await as(id.lead, async () => {
    try {
      await app.query("truncate action");
      fail("the app role cannot truncate a table", "the truncate succeeded");
    } catch {
      ok("the app role cannot truncate a table");
    }
  });

  await app.end();
} catch {
  // The specific failure has already been reported.
} finally {
  await owner.end().catch(() => {});
  await pgServer.stop().catch(() => {});
  await rm(DATA_DIR, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nAll database checks passed." : `\nFAILED — ${failures} check(s)`);
process.exit(failures > 0 ? 1 : 0);
