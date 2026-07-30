/**
 * Vercel build step.
 *
 *   prisma generate → prisma migrate deploy → next build
 *
 * Exists so the Neon integration's variable names work without hand-editing
 * anything it manages. `prisma migrate` needs a real session, which a
 * transaction pooler will not give it, so DIRECT_URL has to point at the
 * unpooled host — and the integration calls that DATABASE_URL_UNPOOLED.
 */
import { execFileSync } from "node:child_process";

const env = { ...process.env };

// Prisma's `directUrl` reads DIRECT_URL. Fall back to whatever the provider
// integration called the unpooled host.
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
  console.error(
    "[build] DATABASE_URL is not set. Migrations cannot run.\n" +
      "        See docs/neon-and-vercel.md.",
  );
  process.exit(1);
}

// A missing APP_DATABASE_URL is a security problem, not a build problem: the
// app would otherwise run as the database owner, for whom row level security
// does not apply. src/lib/db.ts refuses to start without it in production, so
// fail here instead — a broken build is easier to notice than a silent one.
if (!env.APP_DATABASE_URL) {
  console.error(
    "\n[build] APP_DATABASE_URL is not set.\n" +
      "        The app must connect as the module_risk_app role, not as the\n" +
      "        database owner — row level security does not apply to a table's\n" +
      "        owner, so every policy would be silently bypassed.\n" +
      "        Run scripts/setup-remote-db.mjs, then set it in Vercel.\n" +
      "        See docs/neon-and-vercel.md.\n",
  );
  process.exit(1);
}

function run(command, args) {
  console.log(`\n[build] ${command} ${args.join(" ")}`);
  execFileSync(command, args, { env, stdio: "inherit" });
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["next", "build"]);
