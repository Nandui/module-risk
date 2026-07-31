"use client";

import * as React from "react";
import { Check, Plus, Search } from "lucide-react";
import type { ControlMeasure } from "@prisma/client";
import type { HazardCategory } from "@/lib/vocab";
import { cn } from "@/lib/utils";

/**
 * Multi-select control measures from the controlled library.
 *
 * Controls matching the hazard's category float to the top — an assessor
 * standing in a plant room should not scroll past ergonomic controls to
 * find the chemical ones.
 *
 * Selection shows an optimistic checkmark: the tick lands on tap, and the
 * autosave indicator upstream is what reports whether it stuck.
 */
export function ControlPicker({
  controls,
  selected,
  onChange,
  category,
  onProposeNew,
  labelledBy,
  disabled,
}: {
  controls: ControlMeasure[];
  selected: string[];
  onChange: (ids: string[]) => void;
  category: HazardCategory | null;
  onProposeNew: (query: string) => void;
  labelledBy?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = React.useState("");

  const ordered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = controls.filter(
      (c) => !needle || c.label.toLowerCase().includes(needle),
    );
    return matching.sort((a, b) => {
      // Selected first so the current answer never scrolls out of view.
      const aSel = selected.includes(a.id) ? 0 : 1;
      const bSel = selected.includes(b.id) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      const aCat = category && a.category === category ? 0 : 1;
      const bCat = category && b.category === category ? 0 : 1;
      if (aCat !== bCat) return aCat - bCat;
      return a.label.localeCompare(b.label);
    });
  }, [controls, query, category, selected]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2" role="group" aria-labelledby={labelledBy}>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search controls"
          aria-label="Search control measures"
          disabled={disabled}
          className="h-11 w-full rounded-[var(--radius)] border border-rule-strong bg-surface-raised pl-9 pr-3 text-ui-lg text-ink placeholder:text-muted focus:border-accent"
        />
      </div>

      <p aria-live="polite" className="font-mono text-data-xs text-muted">
        {selected.length} selected
      </p>

      <ul className="max-h-72 divide-y divide-rule overflow-y-auto rounded-[var(--radius)] border border-rule">
        {ordered.length === 0 ? (
          <li className="px-3 py-6 text-center text-ui-sm text-muted">
            No control in the library matches that.
          </li>
        ) : (
          ordered.map((control) => {
            const isSelected = selected.includes(control.id);
            return (
              <li key={control.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  disabled={disabled}
                  onClick={() => toggle(control.id)}
                  className={cn(
                    // Large targets: this is tapped on a tablet, mid-walk.
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-[var(--duration-quick)]",
                    isSelected ? "bg-accent-wash" : "hover:bg-surface-sunk",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-[var(--radius-sm)] border transition-colors duration-[var(--duration-quick)]",
                      isSelected
                        ? "border-accent bg-accent text-white"
                        : "border-rule-strong bg-surface-raised",
                    )}
                  >
                    {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 text-ui text-ink">{control.label}</span>
                  {category && control.category === category ? (
                    <span className="shrink-0 text-ui-sm text-muted">{control.category}</span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <button
        type="button"
        onClick={() => onProposeNew(query)}
        className="inline-flex items-center gap-1.5 text-ui-sm text-accent-ink hover:underline"
      >
        <Plus aria-hidden className="size-3.5" />
        Propose a new control measure
      </button>
    </div>
  );
}
