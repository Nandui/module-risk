# Neon and Vercel

Setting the app up against a Neon database attached to a Vercel project.

---

## 1. Which Neon URL goes where

Neon gives you two hosts. The difference matters here more than usual.

| Neon variable | Host | Use it for |
| --- | --- | --- |
| `DATABASE_URL` | `…-pooler.…` | Runtime. Serverless functions open and drop connections constantly; the pooler is what keeps that from exhausting the database. |
| `DATABASE_URL_UNPOOLED` | no `-pooler` | Migrations. `prisma migrate` needs a real session — DDL and advisory locks do not survive a transaction pooler. |

Map them onto this app's three:

```
DATABASE_URL      = pooled,   owner role            # Prisma datasource, build-time migrate
DIRECT_URL        = unpooled, owner role            # what migrate actually connects on
APP_DATABASE_URL  = pooled,   module_risk_app role  # what the running app uses
```

Two edits to the strings Neon hands you:

- **Add `?pgbouncer=true`** to the pooled URLs. Prisma caches prepared
  statements, and a transaction pooler hands a different backend to each
  transaction; without this you get sporadic `prepared statement "s0" already
  exists` errors under load.
- **Drop `channel_binding=require`.** It is a libpq option; Prisma's driver
  does not implement it, and `sslmode=require` already gives you TLS.

## 2. Why the app gets its own role

Row level security **does not apply to a table's owner**. Neon's `neondb_owner`
owns everything this app's migrations create, so running the app on that
connection would silently disable every policy in the database — the app would
work perfectly and enforce nothing.

So the app connects as `module_risk_app`, which has:

- DML on every table, and no DDL or `TRUNCATE`
- no `SELECT` on `profile.password_hash` — sign-in reads it through a
  `SECURITY DEFINER` function instead

`src/lib/db.ts` throws on boot in production if `APP_DATABASE_URL` is missing,
rather than quietly falling back to the owner.

## 3. Setup — the build does it

You do not need to run anything by hand. Set the three variables in section 5
and deploy; `scripts/vercel-build.mjs` runs on Vercel, where the owner
connection and the database are both already reachable, and it:

1. applies the migrations
2. creates the `module_risk_app` role if it is missing
3. sets that role's password to whatever is in `APP_DATABASE_URL` — so
   rotating the password is "edit the variable, redeploy"
4. grants it DML only, and no read on `profile.password_hash`
5. seeds **only if there are no accounts at all**, which can only be true once
6. connects as the app role and refuses to ship unless an unidentified
   connection reads nothing

It is idempotent and never drops anything. Steps 2–4 re-run on every deploy, so
a role created by hand, or a table added by a later migration, still ends up
with exactly the right privileges.

It also refuses to build if `APP_DATABASE_URL` names the owner role — the one
misconfiguration that disables row level security with no other symptom.

### Doing it from a laptop instead

If you would rather set the database up before the first deploy, from a machine
that can reach Neon on port 5432:

```bash
git clone <this repo> && cd module-risk && npm install

DATABASE_URL='postgresql://neondb_owner:…@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require' \
POOLED_URL='postgresql://neondb_owner:…@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require' \
node scripts/setup-remote-db.mjs
```

`DATABASE_URL` must be the **unpooled** host here. `POOLED_URL` is optional and
only used to print the finished Vercel values.

The script:

1. refuses to run if the database holds tables it does not recognise
2. applies the migrations
3. grants `module_risk_app` its privileges
4. sets that role's password — generated and printed once, unless you pass
   `APP_DB_PASSWORD`
5. seeds the libraries, and the sample assessments if the database is empty
6. **connects as the app role and proves RLS is on** before telling you it worked
7. prints the environment variables to paste into Vercel

It is additive: it creates and inserts, never drops or truncates, and is safe to
re-run.

### If Neon will not let the migration create the role

`CREATE ROLE` needs `CREATEROLE`, which `neondb_owner` normally has through
`neon_superuser`. If your project is configured so it does not, the migration
**still applies in full** — every table and all 25 policies — and only skips the
role. The setup script then tells you so. Recover with:

1. Neon console → Roles → New role → `module_risk_app`
2. re-run the script with `APP_DB_PASSWORD` set to that role's password

Step 3 above grants the privileges, so the hand-created role ends up identical.

## 4. Variable names you do not have to fix

- `DIRECT_URL` is filled from `DATABASE_URL_UNPOOLED` when unset — the name the
  Neon integration uses — so its managed variables work untouched.
- `pgbouncer=true` is added at runtime to any `-pooler` host, so a string
  pasted straight from Neon behaves.
- The build **fails** if `APP_DATABASE_URL` is missing, rather than deploying an
  app that runs as the owner with every policy bypassed. A broken build is
  easier to notice than a silent security downgrade.

## 5. Vercel environment variables

Project → Settings → Environment Variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | pooled, owner. Often already set by the Neon integration — leave it. |
| `DIRECT_URL` | unpooled, owner. Optional if `DATABASE_URL_UNPOOLED` exists. |
| `APP_DATABASE_URL` | pooled host, user `module_risk_app`, **a password you choose**. The build creates the role and applies that password. This is the only one you have to compose. |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `BLOB_READ_WRITE_TOKEN` | Storage → Blob → connect |

A deploy applies any new migration before the new code serves.

## 6. Pooling and the RLS transaction

Every query goes through `withUser()`, which opens a transaction and sets a
transaction-local session variable:

```sql
select set_config('app.user_id', $1, true)
```

The `true` is what makes this safe behind a pooler. PgBouncer in transaction
mode pins one backend for the life of a transaction and resets settings at
commit, so the identity cannot leak into whatever borrows that backend next.
A plain `SET` would leak; this cannot.

It also means an unidentified connection reads *nothing* rather than
everything — verified by `npm run verify:db`, and again against your real
database by the setup script.

## 7. Before real data goes in

- Rotate `neondb_owner`'s password if it has ever been pasted anywhere.
- Remove the demo accounts from `prisma/seed.ts`, or change `SEED_PASSWORD`.
  All six share one password.
- `AUTH_SECRET` must not be the development placeholder.
