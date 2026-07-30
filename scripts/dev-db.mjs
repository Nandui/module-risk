/**
 * A local Postgres for development, with no Docker required.
 *
 *   npm run db:local        # migrate, seed, then stay running
 *   Ctrl-C                  # stops it
 *
 * Downloads a real Postgres binary on first run and keeps its data between
 * runs. Leave this running in its own terminal, the way you would
 * `docker compose up` — Postgres is a child of this process and stops with
 * it. Use a managed Postgres (Neon, Vercel Postgres) for anything shared.
 */
import EmbeddedPostgres from "embedded-postgres";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { APP_ROLE, deriveAppDatabaseUrl, deriveAppPassword } from "../src/lib/app-connection.mjs";

// Outside the repo: initdb needs to chmod its data directory, which fails on
// some mounted filesystems, and a Postgres cluster has no business being in
// a git working tree. Override with DEV_DB_DIR.
const DIR = process.env.DEV_DB_DIR ?? join(tmpdir(), "module-risk-devdb");
const PORT = 55432;

const OWNER_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/risk`;
// Derived exactly as the deploy derives it, so development runs on the same
// least-privilege role as production and RLS is in force here too.
const APP_PASSWORD = deriveAppPassword(OWNER_URL);
const APP_URL = deriveAppDatabaseUrl(OWNER_URL);

const command = process.argv[2] ?? "start";

const server = new EmbeddedPostgres({
  databaseDir: DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  onLog: () => {},
});

if (command === "stop") {
  await server.stop();
  console.log("stopped");
  process.exit(0);
}

const fresh = !existsSync(DIR);
if (fresh) {
  // initdb creates and chmods the directory itself; pre-creating it makes it
  // refuse to start.
  await server.initialise();
}
await server.start();

if (fresh) {
  await server.createDatabase("risk");
}

const env = { ...process.env, DATABASE_URL: OWNER_URL, DIRECT_URL: OWNER_URL };

console.log("applying migrations…");
execFileSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit" });

// The app role is created by the migration; give it a password so the app
// can actually connect as it, and so RLS is in force in development too.
const owner = new pg.Client({ connectionString: OWNER_URL });
await owner.connect();
await owner.query(`alter role ${APP_ROLE} with password '${APP_PASSWORD}'`);
await owner.end();

console.log("seeding…");
execFileSync("npx", ["tsx", "prisma/seed.ts"], { env, stdio: "inherit" });

// `.env` rather than `.env.local`: the Prisma CLI only reads `.env`, and
// Next.js reads it too, so one file serves both.
const envFile = new URL("../.env", import.meta.url).pathname;
if (!existsSync(envFile)) {
  await writeFile(
    envFile,
    [
      "# Written by scripts/dev-db.mjs. Local development only.",
      `DATABASE_URL="${OWNER_URL}"`,
      `APP_DATABASE_URL="${APP_URL}"`,
      `DIRECT_URL="${OWNER_URL}"`,
      'AUTH_SECRET="local-development-secret-change-in-production"',
      "",
    ].join("\n"),
  );
  console.log(`wrote ${envFile}`);
} else {
  console.log(".env already exists — left alone");
}

console.log(`
Postgres is listening on port ${PORT}.
Data directory: ${DIR}

  owner (migrations, seed)  ${OWNER_URL}
  app   (RLS in force)      ${APP_URL}

Leave this running. In another terminal:  npm run dev
Sign in:  lead@example.com / risk-demo-1234
`);

// Postgres is a child of this process, so the script has to stay resident.
// Exiting here would take the database with it.
let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${signal} — stopping Postgres…`);
  await server.stop().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// Keep the event loop alive without spinning.
await new Promise(() => {});
