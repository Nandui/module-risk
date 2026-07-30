# Neon and Vercel

Setting the app up against a Neon database attached to a Vercel project.

---

## 1. Which Neon URL goes where

Neon gives you two hosts. The difference matters here more than usual.

| Neon variable | Host | Use it for |
| --- | --- | --- |
| `DATABASE_URL` | `…-pooler.…` | Runtime. Serverless functions open and drop connections constantly; the pooler is what keeps that from exhausting the database. |
| `DATABASE_URL_UNPOOLED` | no `-pooler` | Migrations. `prisma migrate` needs a real session — DDL and advisory locks do not survive a transaction pooler. |

Map them onto this app's:

```
DATABASE_URL      = pooled,   owner role            # Prisma datasource, build-time migrate
DIRECT_URL        = unpooled, owner role            # what migrate actually connects on
APP_DATABASE_URL  = pooled,   module_risk_app role  # OPTIONAL — derived when unset
```

Paste Neon's strings in unedited. Two fixes they need are applied in code
(`src/lib/app-connection.mjs`), because the Neon integration manages these
variables itself and there is no hand-edited copy for a fix to live in:

- **`pgbouncer=true`** is added to pooled URLs. Prisma caches prepared
  statements, and a transaction pooler hands a different backend to each
  transaction; without this you get sporadic `prepared statement "s0" already
  exists` errors under load.
- **`channel_binding=require` is stripped.** It is a libpq option; Prisma's
  driver does not implement it, and `sslmode=require` already gives you TLS.

## 2. Why the app gets its own role

Row level security **does not apply to a table's owner**. Neon's `neondb_owner`
owns everything this app's migrations create, so running the app on that
connection would silently disable every policy in the database — the app would
work perfectly and enforce nothing.

So the app connects as `module_risk_app`, which has:

- DML on every table, and no DDL or `TRUNCATE`
- no `SELECT` on `profile.password_hash` — sign-in reads it through a
  `SECURITY DEFINER` function instead

### …and why you do not have to configure it

That role needs a password, which is a secret, which is normally one more
thing to set by hand and one more way to get a deployment subtly wrong — and
the way it goes wrong (pointing it at the owner) has no symptom at all.

So it is derived. The app role's password is an HMAC keyed on the **owner's**
password, which is already in `DATABASE_URL` wherever this app runs. The build
applies that value to the role; the running app computes the same value;
neither stores it. Leave `APP_DATABASE_URL` unset and it is worked out from
`DATABASE_URL`: same host, same database, different role.

This does not weaken anything. Whoever holds the owner password already has
unrestricted access to the database, so a credential derived from it grants
them nothing new — deriving the *greater* credential from the lesser would be
the mistake, and this is the other way round.

`AUTH_SECRET` is deliberately **not** derived this way. It signs session
cookies, and keeping it independent of the database password means a leaked
database credential cannot also be used to forge sessions. It is the one
variable you have to set.

Set `APP_DATABASE_URL` explicitly if you want the app on a different role or
host; it always takes precedence. `src/lib/db.ts` throws on boot in production
if it is neither set nor derivable, rather than quietly falling back to the
owner.

## 3. Setup — the build does it

You do not need to run anything by hand. With the Neon integration connected,
add `AUTH_SECRET` and deploy; `scripts/vercel-build.mjs` runs on Vercel, where
the owner connection and the database are both already reachable, and it:

1. applies the migrations
2. creates the `module_risk_app` role if it is missing
3. sets that role's password to the derived value (or to whatever
   `APP_DATABASE_URL` carries, if you set it)
4. grants it DML only, and no read on `profile.password_hash`
5. seeds **only if there are no accounts at all**, which can only be true once
6. connects as the app role and refuses to ship unless an unidentified
   connection reads nothing

It is idempotent and never drops anything. Steps 2–4 re-run on every deploy, so
a role created by hand, or a table added by a later migration, still ends up
with exactly the right privileges.

It also refuses to build if `APP_DATABASE_URL` names the owner role — the one
misconfiguration that disables row level security with no other symptom — and
if `AUTH_SECRET` is missing, printing a freshly generated value to paste in.

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
4. sets that role's password to the value the app derives, so there is nothing
   to carry over to Vercel (pass `APP_DB_PASSWORD` to choose your own instead,
   in which case you must also set `APP_DATABASE_URL`)
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
- `pgbouncer=true` is added, and `channel_binding` removed, for any `-pooler`
  host, so a string pasted straight from Neon behaves.
- `APP_DATABASE_URL` is derived from `DATABASE_URL` when unset, so there is no
  connection string to compose. If it *is* set and names the owner role, the
  build fails rather than deploying an app with every policy bypassed.

## 5. Vercel environment variables

Project → Settings → Environment Variables:

| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32`. **The only one you have to set.** |
| `DATABASE_URL` | pooled, owner. Set by the Neon integration — leave it. |
| `DIRECT_URL` | unpooled, owner. Not needed if `DATABASE_URL_UNPOOLED` exists, which the integration also sets. |
| `APP_DATABASE_URL` | Optional. Derived from `DATABASE_URL` when unset. |
| `BLOB_READ_WRITE_TOKEN` | Storage → Blob → connect. Only needed for photo evidence. |

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

- Rotate `neondb_owner`'s password if it has ever been pasted anywhere. Note
  that this also rotates the derived app-role password: redeploy afterwards so
  the build applies the new one. (If it has been pasted somewhere, rotate it
  regardless — that is what rotation is for.)
- Remove the demo accounts from `prisma/seed.ts`, or change `SEED_PASSWORD`.
  All six share one password.
- `AUTH_SECRET` must not be the development placeholder.
