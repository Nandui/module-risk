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

See [`docs/design-plan.md`](docs/design-plan.md) for the palette, type scale,
layout and signature element, and for the two places this deliberately departs
from the brief.

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
Recharts · Supabase (Postgres, Auth, Storage, RLS from day one) · Server Actions
for every mutation · server-side PDF via headless Chromium · Vercel.

No state-management library, no CSS-in-JS, no REST or tRPC layer, and
`window.print()` is not used anywhere.

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in your Supabase URL and anon key
```

Then apply the schema. With the Supabase CLI and Docker:

```bash
supabase start
supabase db reset              # runs migrations, then supabase/seed.sql
```

Against a hosted project, run the files in order in the SQL editor:

1. `supabase/migrations/20260730090000_schema.sql` — tables, constraints, triggers
2. `supabase/migrations/20260730090100_rls.sql` — row level security
3. `supabase/migrations/20260730090200_storage.sql` — the private evidence bucket
4. `supabase/seed.sql` — libraries, templates and a plausible group

The seed's first block creates three demo sign-ins (password
`risk-demo-1234`) so the app is usable immediately:

| Email | Role | Can |
| --- | --- | --- |
| `lead@example.com` | H&S lead | Everything, including approving library additions |
| `manager@example.com` | Centre manager | Sign off and revise assessments |
| `assessor@example.com` | Assessor | Author assessments, send for review |

**Delete that block before seeding a production project.**

```bash
npm run dev
```

## Verification

Three harnesses, all runnable without a Supabase project:

```bash
npm run verify:sql      # migrations + seed against a real Postgres
npm run verify:risk     # invariants of the risk engine
npm run typecheck
```

`verify:sql` downloads and starts a throwaway Postgres, stubs the handful of
Supabase `auth` and `storage` objects the migrations touch, runs every migration
and the seed, then asserts the append-only guarantees actually hold — that a
signed-off assessment refuses edits, that a revision cannot be rewritten, and
that a residual score above its initial is rejected. It checks SQL correctness,
not RLS behaviour, which needs real JWT roles.

`verify:risk` covers scoring, banding, the escalation threshold, matrix layout
and the initial → residual arithmetic. It exists because the engine once shipped
with `bandMeta` guessing whether its argument was a score or a band, which
reported every residual of 5 as "Very high" instead of "Low" — a mistake with no
signature a type checker could catch.

### Design reference

In development only, two routes render the design system and the screens
without needing a database:

- `/preview` — tokens, the type scale, and the tile matrix in isolation
- `/preview/screens` — register, assessment document and actions list on
  synthetic data, so density can be judged
- `/preview/print` — the print variant, for exercising the PDF pipeline

```bash
node scripts/screenshot.mjs ./shots register=/preview/screens
```

Both `/preview` routes return 404 outside development.

## Data model

```
centre           id, name, code, address
centre_member    which centres a person works across
profile          one row per auth user; role: assessor | manager | hs_lead
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

## Deploying

Vercel, with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set.

PDF generation runs headless Chromium in a Node runtime function with
`maxDuration = 60`. In production it uses `@sparticuz/chromium`; locally it
picks up a system Chromium, or whatever `CHROMIUM_EXECUTABLE_PATH` points at.
The PDF routes render real app routes and forward the caller's own cookies, so a
PDF can never contain more than the person requesting it is allowed to see.
