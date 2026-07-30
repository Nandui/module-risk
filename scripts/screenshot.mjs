/**
 * Screenshot routes from a running dev server, for visual review.
 *
 *   node scripts/screenshot.mjs <outDir> <name>=<path> [<name>=<path> …]
 *
 * Uses the same Chromium the PDF pipeline uses.
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const [outDir, ...specs] = process.argv.slice(2);
if (!outDir || specs.length === 0) {
  console.error("usage: node scripts/screenshot.mjs <outDir> <name>=<path> …");
  process.exit(1);
}

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/opt/pw-browsers/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

for (const spec of specs) {
  const eq = spec.indexOf("=");
  const name = spec.slice(0, eq);
  const path = spec.slice(eq + 1);
  const width = Number(process.env.WIDTH ?? 1440);

  const page = await browser.newPage();
  await page.setViewport({ width, height: 1000, deviceScaleFactor: 2 });
  const response = await page.goto(new URL(path, BASE).toString(), {
    waitUntil: "networkidle0",
    timeout: 60_000,
  });
  await page.evaluateHandle("document.fonts.ready");

  const file = `${outDir}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${response?.status()}  ${path} -> ${file}`);
  await page.close();
}

await browser.close();
