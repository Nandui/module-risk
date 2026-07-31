"use client";

import * as React from "react";
import { Bookmark, BookmarkPlus, Search, X } from "lucide-react";
import type { RegisterRow } from "@/lib/data/assessments";
import { ASSESSMENT_STATUSES, STATUS_META, type AssessmentStatus } from "@/lib/vocab";
import { BAND_META, RISK_BANDS, type RiskBand } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface RegisterFilters {
  centres: string[];
  statuses: AssessmentStatus[];
  bands: RiskBand[];
  overdueOnly: boolean;
  withOpenActions: boolean;
}

export const emptyFilters: RegisterFilters = {
  centres: [],
  statuses: [],
  bands: [],
  overdueOnly: false,
  withOpenActions: false,
};

export function matchesFilters(
  row: RegisterRow,
  filters: RegisterFilters,
  query: string,
): boolean {
  if (filters.centres.length && !filters.centres.includes(row.centreId)) return false;
  if (filters.statuses.length && !filters.statuses.includes(row.status)) return false;
  if (filters.bands.length && (!row.band || !filters.bands.includes(row.band))) return false;
  if (filters.overdueOnly && row.reviewState !== "overdue") return false;
  if (filters.withOpenActions && row.openActions === 0) return false;

  if (query.trim()) {
    const needle = query.trim().toLowerCase();
    const haystack = `${row.reference} ${row.title} ${row.centreName} ${row.assessorName}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

const SAVED_VIEWS_KEY = "mr.savedViews";

interface SavedView {
  name: string;
  filters: RegisterFilters;
  query: string;
}

/**
 * Filter chips and saved views.
 *
 * Chips rather than a row of dropdowns: a manager scanning a register wants
 * to see what is currently applied without opening anything.
 */
export function FilterBar({
  rows,
  filters,
  onFiltersChange,
  query,
  onQueryChange,
  showCentre,
  shown,
  total,
}: {
  rows: RegisterRow[];
  filters: RegisterFilters;
  onFiltersChange: (filters: RegisterFilters) => void;
  query: string;
  onQueryChange: (query: string) => void;
  showCentre: boolean;
  shown: number;
  total: number;
}) {
  const [views, setViews] = React.useState<SavedView[]>([]);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
      if (raw) setViews(JSON.parse(raw) as SavedView[]);
    } catch {
      // A corrupt saved-views blob is not worth surfacing; start clean.
    }
  }, []);

  // `/` focuses the filter, the convention in every serious table.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const persist = (next: SavedView[]) => {
    setViews(next);
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
  };

  const centres = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    for (const row of rows) {
      map.set(row.centreId, {
        id: row.centreId,
        name: row.centreName,
        code: row.centreCode,
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const toggle = <K extends "centres" | "statuses" | "bands">(
    key: K,
    value: RegisterFilters[K][number],
  ) => {
    const current = filters[key] as RegisterFilters[K][number][];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next } as RegisterFilters);
  };

  const activeCount =
    filters.centres.length +
    filters.statuses.length +
    filters.bands.length +
    (filters.overdueOnly ? 1 : 0) +
    (filters.withOpenActions ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const overdueCount = rows.filter((r) => r.reviewState === "overdue").length;

  const saveCurrent = () => {
    const name = window.prompt("Name this view");
    if (!name?.trim()) return;
    persist([
      ...views.filter((v) => v.name !== name.trim()),
      { name: name.trim(), filters, query },
    ]);
  };

  return (
    <div className="space-y-2 border-b border-rule bg-surface px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter by reference, title, centre or assessor"
            aria-label="Filter the register"
            className="h-8 w-full rounded-[var(--radius)] border border-rule-strong bg-surface-raised pl-8 pr-2 text-ui-sm text-ink placeholder:text-muted focus:border-accent"
          />
        </div>

        <FilterChip
          active={filters.overdueOnly}
          onClick={() => onFiltersChange({ ...filters, overdueOnly: !filters.overdueOnly })}
        >
          Overdue
          <Count>{overdueCount}</Count>
        </FilterChip>

        <FilterChip
          active={filters.withOpenActions}
          onClick={() =>
            onFiltersChange({ ...filters, withOpenActions: !filters.withOpenActions })
          }
        >
          Has open actions
        </FilterChip>

        <span aria-hidden className="mx-0.5 h-5 w-px bg-rule" />

        {RISK_BANDS.map((band) => {
          const meta = BAND_META[band];
          const active = filters.bands.includes(band);
          return (
            <button
              key={band}
              type="button"
              onClick={() => toggle("bands", band)}
              aria-pressed={active}
              title={`${meta.label} · ${meta.range}`}
              className={cn(
                "inline-flex min-h-6 items-center gap-1.5 rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-ui-sm transition-colors duration-[var(--duration-quick)]",
                active
                  ? "border-ink bg-surface-raised text-ink"
                  : "border-rule-strong text-muted hover:text-ink",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-4 shrink-0 place-items-center stencil text-stencil-xs",
                  meta.fill,
                )}
              >
                {band}
              </span>
              {meta.label}
            </button>
          );
        })}

        <span aria-hidden className="mx-0.5 h-5 w-px bg-rule" />

        {ASSESSMENT_STATUSES.map((status) => (
          <FilterChip
            key={status}
            active={filters.statuses.includes(status)}
            onClick={() => toggle("statuses", status)}
          >
            {STATUS_META[status].label}
          </FilterChip>
        ))}

        {showCentre && centres.length > 1 ? (
          <>
            <span aria-hidden className="mx-0.5 h-5 w-px bg-rule" />
            {centres.map((centre) => (
              <FilterChip
                key={centre.id}
                active={filters.centres.includes(centre.id)}
                onClick={() => toggle("centres", centre.id)}
              >
                {centre.code}
              </FilterChip>
            ))}
          </>
        ) : null}

        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onFiltersChange(emptyFilters);
              onQueryChange("");
            }}
          >
            <X aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p aria-live="polite" className="font-mono text-data-xs text-muted">
          {shown === total ? `${total} assessments` : `${shown} of ${total} assessments`}
        </p>

        {views.length > 0 ? <span aria-hidden className="h-4 w-px bg-rule" /> : null}

        {views.map((view) => (
          <span key={view.name} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => {
                onFiltersChange(view.filters);
                onQueryChange(view.query);
              }}
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-ui-sm text-accent-ink hover:bg-accent-wash"
            >
              <Bookmark aria-hidden className="size-3" />
              {view.name}
            </button>
            <button
              type="button"
              onClick={() => persist(views.filter((v) => v.name !== view.name))}
              aria-label={`Delete the ${view.name} view`}
              className="grid size-5 place-items-center rounded-[var(--radius-sm)] text-muted hover:text-risk-5-ink"
            >
              <X aria-hidden className="size-3" />
            </button>
          </span>
        ))}

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={saveCurrent}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-ui-sm text-muted hover:bg-surface-sunk hover:text-ink"
          >
            <BookmarkPlus aria-hidden className="size-3" />
            Save this view
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 py-0.5 text-ui-sm transition-colors duration-[var(--duration-quick)]",
        active
          ? "border-ink bg-ink text-surface-raised"
          : "border-rule-strong bg-surface-raised text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-data-xs opacity-70">{children}</span>;
}
