import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/**
 * One family, two cuts.
 *
 * Geist is Vercel's own face and is drawn for interface density; the mono cut
 * carries anything that has to line up in a column. There is no third display
 * face: at this density a separate display voice fragments the page, and
 * hierarchy is carried by size, weight and tone instead.
 */
const body = Geist({
  subsets: ["latin"],
  variable: "--ff-body",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--ff-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Risk register",
    template: "%s · Risk register",
  },
  description:
    "Health and safety risk assessments across the leisure centre group.",
};

export const viewport: Viewport = {
  // Matches --color-surface in each theme. Unavoidably a literal: a viewport
  // export cannot read a CSS variable.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F7" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1A18" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-[var(--radius)] !border !border-rule !bg-surface-raised !text-ink !font-sans !text-ui-sm !shadow-none",
              description: "!text-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
