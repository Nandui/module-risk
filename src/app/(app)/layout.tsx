import { requireSession } from "@/lib/data/session";
import { getRegister } from "@/lib/data/assessments";
import { getActions } from "@/lib/data/actions";
import { listHazards } from "@/lib/data/library";
import { AppShell } from "@/components/shell/app-shell";
import type { PaletteItem } from "@/components/shell/command-palette";

/**
 * The shell. Everything the command palette can reach is gathered here, so
 * ⌘K is instant on every screen rather than searching over the wire.
 *
 * The palette deliberately spans every centre even when one centre is
 * selected — "jump to any centre, assessment, hazard or open action" means
 * any, and a group H&S lead should not have to switch site first.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  const [register, actions, hazards] = await Promise.all([
    getRegister(null),
    getActions(null),
    listHazards(),
  ]);

  const items: PaletteItem[] = [
    { id: "register", kind: "screen", label: "Register", href: "/register" },
    { id: "actions", kind: "screen", label: "Actions", href: "/actions" },
    { id: "reports", kind: "screen", label: "Reports", href: "/reports" },
    { id: "library", kind: "screen", label: "Library", href: "/library" },
    {
      id: "new",
      kind: "screen",
      label: "New assessment",
      href: "/assessments/new",
    },

    ...session.centres.map(
      (centre): PaletteItem => ({
        id: centre.id,
        kind: "centre",
        label: centre.name,
        detail: centre.code,
        href: `/register?centre=${centre.id}`,
      }),
    ),

    ...register.map(
      (row): PaletteItem => ({
        id: row.id,
        kind: "assessment",
        label: row.title,
        detail: row.centreName,
        reference: row.reference,
        score: row.residualScore || undefined,
        href: `/register?a=${row.id}`,
      }),
    ),

    ...actions.slice(0, 60).map(
      (action): PaletteItem => ({
        id: action.id,
        kind: "action",
        label: action.description,
        detail: action.centreCode,
        score: action.residualScore,
        href: `/actions?a=${action.id}`,
      }),
    ),

    ...hazards.map(
      (hazard): PaletteItem => ({
        id: hazard.id,
        kind: "hazard",
        label: hazard.label,
        detail: hazard.category,
        href: `/library?h=${hazard.id}`,
      }),
    ),
  ];

  return (
    <AppShell session={session} paletteItems={items}>
      {children}
    </AppShell>
  );
}
