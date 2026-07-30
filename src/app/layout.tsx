import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/**
 * Three type roles, and the contrast between them does the work.
 *
 * Archivo carries a `wdth` axis — loading it is what gives the Expanded
 * width the display role depends on. Without the axis this is just another
 * bold sans and the institutional signage register is lost.
 */
// `weight` is deliberately omitted: declaring the `wdth` axis requires the
// variable font, and a fixed weight list would pin it to static instances.
const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--ff-display",
  display: "swap",
});

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
  themeColor: "#0B1417",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${mono.variable}`}>
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
