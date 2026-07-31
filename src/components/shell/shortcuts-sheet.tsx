"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard } from "lucide-react";

const GROUPS = [
  {
    title: "Anywhere",
    rows: [
      ["⌘K", "Jump to a centre, assessment, hazard or action"],
      ["?", "Show this list"],
      ["G then R", "Register"],
      ["G then A", "Actions"],
      ["G then P", "Reports"],
      ["N", "New assessment"],
    ],
  },
  {
    title: "Register",
    rows: [
      ["↑ ↓", "Move between rows"],
      ["Enter", "Open the assessment"],
      ["Esc", "Close the detail sheet"],
      ["/", "Focus the filter"],
    ],
  },
  {
    title: "Risk matrix",
    rows: [
      ["← ↑ → ↓", "Move around the grid"],
      ["Enter or Space", "Choose the cell"],
      ["Home / End", "Lowest / highest cell"],
    ],
  },
] as const;

/** `?` opens the shortcuts list. Full keyboard operation is a requirement. */
export function ShortcutsSheet() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?") return;
      const target = event.target as HTMLElement | null;
      // Never steal `?` from someone typing.
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setOpen((v) => !v);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-ui-sm text-muted transition-colors duration-[var(--duration-quick)] hover:bg-surface-sunk hover:text-ink">
        <Keyboard aria-hidden className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Shortcuts</span>
        <kbd className="rounded-[var(--radius-sm)] border border-rule bg-surface-raised px-1 font-mono text-[0.6875rem] text-muted">
          ?
        </kbd>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 [animation:overlay-in_var(--duration-quick)_var(--ease-settle)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(34rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-sheet)] border border-rule bg-surface-raised p-6">
          <Dialog.Title className="font-display text-title-sm font-bold">
            Keyboard shortcuts
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-ui-sm text-muted">
            The register and the matrix are fully keyboard operable.
          </Dialog.Description>

          <div className="mt-5 space-y-5">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="eyebrow">{group.title}</p>
                <dl className="mt-2 divide-y divide-rule">
                  {group.rows.map(([keys, description]) => (
                    <div key={keys} className="flex items-baseline gap-3 py-1.5">
                      <dt className="w-32 shrink-0">
                        <kbd className="rounded-[var(--radius-sm)] border border-rule bg-surface px-1.5 py-0.5 font-mono text-data-xs text-ink-soft">
                          {keys}
                        </kbd>
                      </dt>
                      <dd className="text-ui-sm text-ink-soft">{description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
