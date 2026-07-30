import Link from "next/link";
import { ClipboardList, LibraryBig, ListChecks, PieChart, Plus } from "lucide-react";
import type { Session } from "@/lib/data/session";
import { ROLE_META } from "@/lib/vocab";
import { CentreSwitcher } from "@/components/shell/centre-switcher";
import { RailLink } from "@/components/shell/rail-link";
import { CommandPalette } from "@/components/shell/command-palette";
import { ShortcutsSheet } from "@/components/shell/shortcuts-sheet";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import type { PaletteItem } from "@/components/shell/command-palette";

const NAV = [
  { href: "/register", label: "Register", icon: ClipboardList },
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/library", label: "Library", icon: LibraryBig },
] as const;

/**
 * Persistent left rail: centre switcher at the top, then nav.
 *
 * Below `md` the rail becomes a bottom bar. An assessor walking a plant room
 * holds a tablet one-handed, and a hamburger at the top of the screen is the
 * furthest point from their thumb.
 */
export function AppShell({
  session,
  paletteItems,
  children,
}: {
  session: Session;
  paletteItems: PaletteItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="sticky top-0 z-30 hidden shrink-0 flex-col border-r border-rule bg-surface-raised md:flex md:h-dvh md:w-rail">
        <div className="border-b border-rule p-2">
          <CentreSwitcher centres={session.centres} centreId={session.centreId} />
        </div>

        <div className="px-3 py-3">
          <Button asChild variant="primary" size="md" className="w-full justify-start">
            <Link href="/assessments/new">
              <Plus aria-hidden />
              New assessment
            </Link>
          </Button>
        </div>

        <nav aria-label="Main" className="flex-1 space-y-0.5 px-2">
          {NAV.map((item) => (
            <RailLink key={item.href} href={item.href} label={item.label}>
              <item.icon aria-hidden className="size-4 shrink-0" />
            </RailLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-rule p-3">
          <CommandPalette items={paletteItems} />
          <ShortcutsSheet />

          <div className="flex items-center gap-2 pt-1">
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-wash font-mono text-data-xs text-accent-ink"
            >
              {initials(session.profile.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ui-sm text-ink">
                {session.profile.fullName}
              </span>
              <span className="block truncate text-ui-sm text-muted">
                {ROLE_META[session.profile.role].label}
              </span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Small screens: the switcher stays reachable at the top, nav moves to
          the foot of the screen. */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-rule bg-surface-raised px-2 py-1.5 md:hidden">
        <div className="min-w-0 flex-1">
          <CentreSwitcher centres={session.centres} centreId={session.centreId} />
        </div>
        <CommandPalette items={paletteItems} compact />
        <Button asChild variant="primary" size="icon" aria-label="New assessment">
          <Link href="/assessments/new">
            <Plus aria-hidden />
          </Link>
        </Button>
      </header>

      <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-rule bg-surface-raised md:hidden"
      >
        {NAV.map((item) => (
          <RailLink key={item.href} href={item.href} label={item.label} variant="bar">
            <item.icon aria-hidden className="size-5 shrink-0" />
          </RailLink>
        ))}
      </nav>
    </div>
  );
}
