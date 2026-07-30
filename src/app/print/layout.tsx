/**
 * The print surface. No shell, no rail, no interactive chrome — headless
 * Chromium renders these routes to PDF.
 *
 * White page rather than the app's cool off-white: `--surface` is right on a
 * screen and wrong on paper, where the paper is already the surface.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-white text-ink">{children}</div>;
}
