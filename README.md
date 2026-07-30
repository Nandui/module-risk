# Risk register

Health & safety risk assessments across a leisure centre group — pools, gyms,
studios, changing rooms, plant rooms, soft play and outdoor areas.

Replaces a paper and spreadsheet process. Used by duty managers, centre managers
and a group-level H&S lead.

The domain content — the hazard library, the control-measure library, the
templates, the rating vocabulary and the escalation threshold — is carried over
from the `riskly` module of the Centrely suite, where it was written against a
real operation. Free-text hazard and control fields have been lifted into
controlled library rows, because prose cannot be compared across centres and
cross-centre comparison is the entire value of this product to a group.

See [`DESIGN.md`](DESIGN.md) for the visual system — palette, type scale,
layout, the signature matrix, and the named rules that govern them — and
[`PRODUCT.md`](PRODUCT.md) for the product record: users, jurisdiction,
accessibility duty, and what must never be invented.

---

## The three jobs

Every screen serves one of them, and density is split accordingly.

| Job | Who | Screen | Optimised for |
| --- | --- | --- | --- |
| **Create** | Assessor on a site walk, on a tablet | Authoring flow | Speed of entry, low error rate. Large targets, one hazard at a time, autosave — no Save button to forget mid-walk. |
| **Check** | Centre manager | Register | Information density and scanning. A real table: sticky header, column sort, filter chips, saved views. |
| **Report** | Group H&S lead | Reports | Defensibility and export quality. The PDF is the artefact an inspector reads. |

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4, CSS-first `@theme`
· shadcn/ui primitives · React Hook Form + Zod · TanStack Table · Motion ·
Recharts · **Postgres with Prisma 6** · **Auth.js v5** · **Vercel Blob** for
photo evidence · Server Actions for every mutation · server-side PDF via
headless Chromium · Vercel.

The same stack as the `centrely` suite, so a developer moves between the two
apps without relearning anything.

No state-management library, no CSS-in-JS, no REST or tRPC layer, and
`window.print()` is not used anywhere.

## Getting started

### Locally, with no Docker

```bash
npm install
npm run db:local      # downloads Postgres, migrates, seeds, writes .env
```

Leave that running — Postgres is a child of it, the way you would leave
`docker compose up` running. Then in another terminal:

```bash
npm run dev
```

Sign in as `lead@example.com` / `risk-demo-1234`.

### Against a managed Postgres

Neon, Vercel Postgres, or anything else that speaks Postgres 14+. One command,
from a machine that can reach it on port 5432:

```bash
DATABASE_URL='<owner, UNPOOLED host>' \
POOLED_URL='<owner, pooled host>' \
  node scripts/setup-remote-db.mjs
```

It refuses to touch a database holding tables it does not own, migrates, creates
and grants the app role, seeds, **proves row level security is in force by
connecting as the app role**, and prints the variables to paste into Vercel.
Additive only — it never drops or truncates, and is safe to re-run.

Neon specifics (pooled vs unpooled, `pgbouncer=true`, what to do if the owner
lacks `CREATEROLE`) are in
[`docs/neon-and-vercel.md`](docs/neon-and-vercel.md).

## Two connection strings, and why

```
DATABASE_URL      the OWNER role — migrations and seed only
APP_DATABASE_URL  the module_risk_app role — what the app runs on
```

**Row level security does not apply to a table's owner.** Running the app on the
migration connection would silently disable every policy in the database, so the
app must connect as the least-privilege role instead. `src/lib/db.ts` throws in
production rather than fall back to the owner, because a silent downgrade here
is the exact failure this setup exists to prevent.

`APP_DATABASE_URL` is nevertheless **optional**, and normally unset. The app
role's password is an HMAC keyed on the owner's, which is already in
`DATABASE_URL` wherever this app runs: the deploy applies that value to the
role, the app computes the same value, and neither stores it. So the second
connection string is derived rather than configured — which matters because
composing it by hand has exactly one failure mode, pointing it at the owner,
and that failure has no symptom.

Deriving it from the owner password weakens nothing: anyone holding that
password already has unrestricted access to the database. `AUTH_SECRET` is
pointedly not derived the same way — it signs session cookies, and a leaked
database credential should not also be able to forge sessions. It is the only
variable a deployment must be given.

The role itself has DML on every table and nothing else — no DDL, no `TRUNCATE`, and no
`SELECT` on `profile.password_hash`. Sign-in reads the hash through a
`SECURITY DEFINER` function, so an ordinary query cannot leak it even by
accident. Prisma is configured with `omit: { profile: { passwordHash: true } }`
to match; without it, Prisma's default "return every scalar field" makes
`profile.findUnique()` fail outright.

### How the app identifies itself to the policies

Every query goes through `withUser(userId, fn)`, which opens a transaction and
sets a transaction-local session variable:

```sql
select set_config('app.user_id', $1, true)
```

The policies read it via `app_uid()`. Transaction-local matters: the identity
cannot leak to the next request that borrows the same pooled connection. A
connection that never identifies itself reads nothing at all, rather than
reading everything.

## Verification

Three harnesses. None of them needs a hosted database.

```bash
npm run verify        # all three
npm run verify:db     # migrations, seed, append-only guards, RLS behaviour
npm run verify:risk   # 38 invariants of the risk engine
npm run verify:url    # connection-string handling and the derived app role
npm run typecheck
```

`verify:db` starts a throwaway Postgres, applies the migrations, runs the seed,
then connects **as the app role** and asserts what each role can and cannot do:
that an assessor can edit their own draft but not a signed-off record, that they
cannot create a centre or self-approve a library addition, that a revision
cannot be attributed to someone else, that the app role can neither read a
password hash nor drop a table, and that an unidentified connection reads
nothing.

Those RLS assertions were impossible to write on Supabase, where identity comes
from a signed JWT. Moving to a session variable made the policies testable, which
is the main engineering benefit of the change.

`verify:risk` covers scoring, banding, the escalation threshold, matrix layout
and the initial → residual arithmetic. It exists because the engine once shipped
with `bandMeta` guessing whether its argument was a score or a band, reporting
every residual of 5 as "Very high" instead of "Low" — a mistake with no signature
a type checker could catch.

### Driving the real app

```bash
node scripts/drive-app.mjs ./shots
```

Signs in with a real browser, walks every screen, screenshots each one, and fails
on any console or page error. This is the check that Auth.js, Prisma, RLS and the
Server Actions work *together*, not just that they compile.

### Design reference

Development only — these routes 404 in production:

- `/preview` — tokens, the type scale, and the tile matrix in isolation
- `/preview/screens` — register, document and actions on synthetic data
- `/preview/print` — the print variant, for exercising the PDF pipeline

## Data model

```
centre           id, name, code, address
centre_member    which centres a person works across
profile          identity, role (assessor | manager | hs_lead), password hash
template         id, name, category, hazard_ids[]      -- e.g. "Pool plant room"
hazard           id, label, category, guidance         -- library, controlled
control_measure  id, label, category                   -- library, controlled
assessment       id, reference, centre_id, template_id, title, status,
                 assessor_id, reviewed_by, review_due_at, signed_off_at
finding          id, assessment_id, hazard_id, likelihood 1-5, severity 1-5,
                 control_measure_ids[], residual_likelihood, residual_severity,
                 persons_at_risk[], notes, photo_ids[]
action           id, finding_id, centre_id, description, owner_id, due_at, closed_at
revision         id, assessment_id, revision_no, snapshot jsonb, reason, created_by
```

`centre_id` is a first-class dimension on every record that belongs to a centre,
from the first commit. Single organisation — there is no `org` column and no
multi-tenancy to add later.

### Two guarantees the database enforces itself

**Assessments are append-only once signed off.** A correction creates a new
revision holding a full `jsonb` snapshot; it never mutates the signed record.
The rule is a trigger, not application code, so the audit trail holds even
against a direct SQL write. Archiving stays possible and keeps the signature the
assessment was put in force with.

**Controls only ever reduce risk.** A residual score above its initial score is
a data-entry error, rejected by a check constraint. The Zod schema catches it
first so the assessor gets a sentence rather than a constraint violation.

### Risk scoring

Score is likelihood (1–5) × severity (1–5), 1 to 25, banded into five levels:

| Band | Label | Rule |
| --- | --- | --- |
| 1 | Very low | 1–4 |
| 2 | Low | 5–9 |
| 3 | Moderate | 10–12 |
| 4 | High | 13–16 |
| 5 | Very high | 17–25 |

That puts 8/7/4/3/3 of the 25 matrix cells in each band — fewer cells as
severity climbs, the right shape for safety. A residual of 10 or above requires
a documented action with an owner and a due date, which is the escalation
threshold the source module used.

Both the initial and the residual score are stored. The delta is the most
persuasive number in any report and cannot be recomputed from the controls.

## Deploying to Vercel

Environment variables:

| Variable | Notes |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32`. The only one you must set by hand. |
| `DATABASE_URL` | Owner role. Set by the Neon/Postgres integration. |
| `DIRECT_URL` | Direct (unpooled) host — Prisma migrate needs it. Filled from `DATABASE_URL_UNPOOLED` when unset. |
| `APP_DATABASE_URL` | Optional. Derived from `DATABASE_URL` when unset. |
| `BLOB_READ_WRITE_TOKEN` | Storage → Blob → connect. Photo evidence only. |

See [`docs/neon-and-vercel.md`](docs/neon-and-vercel.md) for which Neon URL goes
in which variable, and why the app must not run on the owner connection.

`vercel.json` runs `scripts/vercel-build.mjs`, which migrates, provisions the
app role, seeds an empty database, refuses to continue unless an unidentified
connection reads nothing, and only then builds. It gives the two PDF routes 2 GB and 60 seconds — they run headless Chromium via
`@sparticuz/chromium`. Locally the PDF renderer picks up a system Chromium, or
whatever `CHROMIUM_EXECUTABLE_PATH` points at.

The PDF routes render real app routes and forward the caller's own cookies, so a
PDF can never contain more than the person requesting it is allowed to see.

### Before production

- Remove or change the demo accounts in `prisma/seed.ts`. They all share one
  password.
- `AUTH_SECRET` must not be the development placeholder.
- Rotating the owner password also rotates the derived app-role password.
  Redeploy afterwards so the build applies the new one.
