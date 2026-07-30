"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { bandMeta } from "@/lib/risk";

export interface PaletteItem {
  id: string;
  kind: "assessment" | "centre" | "hazard" | "action" | "screen";
  label: string;
  detail?: string;
  reference?: string;
  score?: number;
  href: string;
}

const KIND_LABEL: Record<PaletteItem["kind"], string> = {
  screen: "Go to",
  assessment: "Assessments",
  centre: "Centres",
  hazard: "Hazards",
  action: "Open actions",
};

const ORDER: PaletteItem["kind"][] = ["screen", "assessment", "action", "hazard", "centre"];

/**
 * ⌘K — jump to any centre, assessment, hazard or open action.
 *
 * Everything is passed in from the server rather than searched over the wire:
 * the whole searchable set is a few hundred rows, and a palette that waits on
 * a round trip per keystroke is worse than no palette.
 */
export function CommandPalette({
  items,
  compact = false,
}: {
  items: PaletteItem[];
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href as Route);
  };

  const grouped = ORDER.map((kind) => ({
    kind,
    rows: items.filter((i) => i.kind === kind),
  })).filter((g) => g.rows.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius)] border border-rule-strong bg-surface text-muted transition-colors duration-[var(--duration-quick)] hover:border-rule-strong hover:text-ink",
          compact ? "size-9 justify-center" : "w-full px-2 py-1.5 text-ui-sm",
        )}
        aria-label="Search and jump to"
      >
        <Search aria-hidden className="size-3.5 shrink-0" />
        {compact ? null : (
          <>
            <span className="flex-1 text-left">Jump to…</span>
            <kbd className="rounded-[3px] border border-rule bg-surface-raised px-1 font-mono text-[0.6875rem] text-faint">
              ⌘K
            </kbd>
          </>
        )}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 [animation:overlay-in_var(--duration-quick)_var(--ease-settle)]" />
          <Dialog.Content
            aria-label="Jump to"
            className="fixed left-1/2 top-[12vh] z-50 w-[min(38rem,92vw)] -translate-x-1/2 overflow-hidden rounded-[var(--radius-sheet)] border border-rule bg-surface-raised"
          >
            <Dialog.Title className="sr-only">Jump to</Dialog.Title>
            <Command
              loop
              filter={(value, search) =>
                value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
              }
            >
              <div className="flex items-center gap-2 border-b border-rule px-3">
                <Search aria-hidden className="size-4 shrink-0 text-faint" />
                <Command.Input
                  placeholder="Search assessments, hazards, actions and centres"
                  className="h-12 flex-1 bg-transparent text-ui-lg text-ink outline-none placeholder:text-faint"
                />
              </div>

              <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5">
                <Command.Empty className="px-2 py-8 text-center text-ui-sm text-muted">
                  Nothing matches that. Try a reference, a hazard or a centre name.
                </Command.Empty>

                {grouped.map((group) => (
                  <Command.Group
                    key={group.kind}
                    heading={
                      <span className="eyebrow block px-2 py-1.5">
                        {KIND_LABEL[group.kind]}
                      </span>
                    }
                  >
                    {group.rows.map((item) => (
                      <Command.Item
                        key={`${item.kind}-${item.id}`}
                        value={`${item.label} ${item.reference ?? ""} ${item.detail ?? ""}`}
                        onSelect={() => go(item.href)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-ui data-[selected=true]:bg-surface-sunk"
                      >
                        {item.score ? (
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-5 shrink-0 place-items-center stencil text-[0.625rem]",
                              bandMeta(item.score).fill,
                            )}
                          >
                            {item.score}
                          </span>
                        ) : (
                          <span aria-hidden className="size-5 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-ink">
                          {item.label}
                        </span>
                        {item.detail ? (
                          <span className="shrink-0 text-ui-sm text-faint">
                            {item.detail}
                          </span>
                        ) : null}
                        {item.reference ? (
                          <span className="shrink-0 font-mono text-data-xs text-muted">
                            {item.reference}
                          </span>
                        ) : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
