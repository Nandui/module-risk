"use client";

import * as React from "react";
import { Command } from "cmdk";
import * as Popover from "@radix-ui/react-popover";
import { ChevronsUpDown, Plus } from "lucide-react";
import type { Hazard } from "@prisma/client";
import { CATEGORY_META } from "@/lib/vocab";
import { cn } from "@/lib/utils";

/**
 * Hazard selection by typeahead from the controlled library.
 *
 * Free text is not an option here. "Add new" exists but lives at the bottom
 * of the list and opens a separate, deliberate form — see ProposeHazardDialog.
 */
export function HazardTypeahead({
  hazards,
  value,
  onChange,
  onProposeNew,
  usedIds,
  id,
  disabled,
}: {
  hazards: Hazard[];
  value: string | null;
  onChange: (hazardId: string) => void;
  onProposeNew: (query: string) => void;
  /** Already on this assessment — shown but not selectable twice. */
  usedIds: Set<string>;
  id: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = value ? hazards.find((h) => h.id === value) : null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-[var(--radius)] border border-rule-strong bg-surface-raised px-3.5 text-left text-ui-lg transition-colors duration-[var(--duration-quick)]",
          "hover:border-rule-strong focus:border-accent disabled:bg-surface-sunk",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", selected ? "text-ink" : "text-muted")}>
          {selected?.label ?? "Search the hazard library…"}
        </span>
        {selected ? (
          <span
            className={cn(
              "shrink-0 rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
              CATEGORY_META[selected.category].chip,
            )}
          >
            {selected.category}
          </span>
        ) : null}
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-(--radix-popover-trigger-width) overflow-hidden rounded-[var(--radius)] border border-rule bg-surface-raised"
        >
          <Command
            loop
            filter={(v, search) =>
              v.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <Command.Input
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Type to search hazards"
              className="h-11 w-full border-b border-rule bg-transparent px-3.5 text-ui-lg text-ink outline-none placeholder:text-muted"
            />

            <Command.List className="max-h-72 overflow-y-auto p-1.5">
              <Command.Empty className="px-2 py-6 text-center text-ui-sm text-muted">
                No hazard in the library matches that.
              </Command.Empty>

              {hazards.map((hazard) => {
                const used = usedIds.has(hazard.id) && hazard.id !== value;
                return (
                  <Command.Item
                    key={hazard.id}
                    value={`${hazard.label} ${hazard.category}`}
                    disabled={used}
                    onSelect={() => {
                      onChange(hazard.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col gap-0.5 rounded-[3px] px-2 py-2 data-[selected=true]:bg-surface-sunk",
                      used && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 text-ui text-ink">
                        {hazard.label}
                      </span>
                      <span className="shrink-0 text-ui-sm text-muted">
                        {used ? "already added" : hazard.category}
                      </span>
                    </span>
                    {hazard.reviewState === "pending_review" ? (
                      <span className="text-ui-sm text-accent-ink">
                        Awaiting review by the H&amp;S lead
                      </span>
                    ) : null}
                  </Command.Item>
                );
              })}
            </Command.List>

            <div className="border-t border-rule p-1.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onProposeNew(query);
                }}
                className="flex w-full items-center gap-2 rounded-[3px] px-2 py-2 text-left text-ui-sm text-accent-ink hover:bg-accent-wash"
              >
                <Plus aria-hidden className="size-3.5 shrink-0" />
                <span className="flex-1">
                  Propose a new hazard
                  {query ? <span className="text-muted"> — “{query}”</span> : null}
                </span>
              </button>
            </div>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
