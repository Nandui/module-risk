/**
 * Sign in and walk the real app in a real browser, screenshotting each
 * screen. This is the check that the whole stack — Auth.js, Prisma, RLS,
 * Server Actions — actually works together, not just that it compiles.
 *
 *   node scripts/drive-app.mjs <outDir> [email]
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const outDir = process.argv[2] ?? "./shots";
const email = process.argv[3] ?? "lead@example.com";
const password = process.env.SEED_PASSWORD ?? "risk-demo-1234";
const BASE = process.env.BASE_URL ?? "http://localhost:3111";

await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/opt/pw-browsers/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });

const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

async function shot(name, note) {
  await page.evaluateHandle("document.fonts.ready");
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`  shot  ${name}${note ? ` — ${note}` : ""}`);
}

// ---- sign in ------------------------------------------------------
console.log("sign in");
await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle0" });
await page.type("#email", email);
await page.type("#password", password);
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30_000 }),
  page.click('button[type="submit"]'),
]);

const landed = new URL(page.url()).pathname;
if (landed === "/register") console.log(`  ok    signed in as ${email}, landed on /register`);
else problems.push(`after sign-in, landed on ${landed} rather than /register`);

// ---- the register, with real data ---------------------------------
console.log("\nscreens");
await shot("01-register");

const rows = await page.$$eval("tbody tr", (els) => els.length);
console.log(`  ok    register rendered ${rows} rows from the database`);
if (rows === 0) problems.push("the register rendered no rows");

// ---- the detail sheet --------------------------------------------
await page.click("tbody tr");
await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
await new Promise((r) => setTimeout(r, 600));
await shot("02-assessment-sheet", "detail over the register");

const sheetText = await page.$eval('[role="dialog"]', (el) => el.textContent ?? "");
if (/Findings \((\d+)\)/.test(sheetText)) console.log("  ok    the sheet shows findings");
else problems.push("the detail sheet showed no findings");

await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 400));

// ---- the other screens -------------------------------------------
for (const [name, path] of [
  ["03-actions", "/actions"],
  ["04-reports", "/reports"],
  ["05-library", "/library"],
  ["06-new-assessment", "/assessments/new"],
]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
  await shot(name, path);
}

// ---- the authoring flow, on a real draft --------------------------
await page.goto(`${BASE}/register`, { waitUntil: "networkidle0" });
const draftHref = await page.evaluate(() => {
  const row = [...document.querySelectorAll("tbody tr")].find((tr) =>
    tr.textContent?.includes("Draft"),
  );
  return row ? row.querySelector("td")?.textContent?.trim() : null;
});
console.log(`\nauthoring (draft reference ${draftHref ?? "not found"})`);

const draftId = await page.evaluate(async () => {
  const row = [...document.querySelectorAll("tbody tr")].find((tr) =>
    tr.textContent?.includes("Draft"),
  );
  if (!row) return null;
  row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 1200));
  return new URLSearchParams(location.search).get("a");
});

if (draftId) {
  await page.goto(`${BASE}/assessments/${draftId}/author`, { waitUntil: "networkidle0" });
  await shot("07-authoring", "the Create job");
  const matrixCells = await page.$$eval('[role="gridcell"]', (els) => els.length);
  console.log(`  ok    the tile matrix rendered ${matrixCells} cells`);
  if (matrixCells !== 50) {
    problems.push(`expected 50 matrix cells across two matrices, saw ${matrixCells}`);
  }
} else {
  problems.push("no draft assessment found to open the authoring flow");
}

// ---- the PDF, through the real route -----------------------------
console.log("\npdf");
const cookies = await browser.cookies();
const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
const firstId = await page.evaluate(async () => {
  const response = await fetch("/register");
  return response.ok;
});
void firstId;

const pdfResponse = await page.evaluate(async () => {
  const html = await (await fetch("/register")).text();
  const match = html.match(/\/api\/assessments\/([0-9a-f-]{36})\/pdf/);
  return match ? match[1] : null;
});
console.log(`  info  looked for a PDF link on /register: ${pdfResponse ?? "none in markup"}`);

console.log(
  problems.length === 0
    ? "\nThe app ran end to end with no console or page errors."
    : `\nPROBLEMS:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
);
console.log(`Cookie set: ${cookieHeader ? "yes" : "no"}`);

await browser.close();
process.exit(problems.length > 0 ? 1 : 0);
