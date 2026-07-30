import "server-only";
import type { Browser } from "puppeteer-core";

/**
 * Server-side PDF generation.
 *
 * Headless Chromium renders a real route from this app, so the artefact an
 * inspector reads uses the same CSS, the same type scale and the same tile
 * matrix as the screen. A second, PDF-only layout would drift from the
 * product within a release, and this document is legal-adjacent.
 *
 * `window.print()` is not used anywhere — the caller never sees a print
 * dialog and the output is byte-identical whoever asks for it.
 */

const A4 = {
  format: "A4" as const,
  printBackground: true,
  margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
};

async function launch(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  // Vercel and other serverless targets need a bundled Chromium build; a
  // long-running server or a dev machine already has one.
  const local =
    process.env.CHROMIUM_EXECUTABLE_PATH ??
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    (process.env.NODE_ENV !== "production" ? "/opt/pw-browsers/chromium" : undefined);

  if (local) {
    return puppeteer.launch({
      executablePath: local,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
    });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

/**
 * Renders a path from this app to PDF. The print route is server-rendered and
 * authenticated by forwarding the caller's own cookies, so a PDF can never
 * contain more than the person asking for it is allowed to see.
 */
export async function renderPdf({
  path,
  cookie,
  origin,
  footerLeft,
}: {
  path: string;
  cookie: string;
  origin: string;
  footerLeft: string;
}): Promise<Uint8Array> {
  const browser = await launch();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1120, height: 1600, deviceScaleFactor: 2 });

    if (cookie) {
      await page.setExtraHTTPHeaders({ cookie });
    }

    const url = new URL(path, origin).toString();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });

    // Web fonts must be resolved before layout is measured, or the display
    // face falls back and every line breaks in a different place.
    await page.evaluateHandle("document.fonts.ready");
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      ...A4,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%;padding:0 14mm;font-family:ui-monospace,monospace;
                    font-size:7pt;color:#667070;display:flex;
                    justify-content:space-between;">
          <span>${escapeHtml(footerLeft)}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
