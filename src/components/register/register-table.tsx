"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { RegisterRow } from "@/lib/data/assessments";
import { STATUS_META } from "@/lib/vocab";
import { formatDate, cn, reviewLabel } from "@/lib/utils";
import { TileChip } from "@/components/risk/tile-chip";
import { FilterBar, type RegisterFilters, emptyFilters, matchesFilters } from "@/components/register/filter-bar";

/**
 * The register. This is a table and it behaves like a serious one: tight
 * rows, sticky header, column sort, filter chips, saved views.
 *
 * Row click opens the detail sheet through the URL (`?a=<id>`), so a row is
 * deep-linkable and the back button does the right thing. The list stays
 * exactly where it was.
 */
export function RegisterTable({
  rows,
  showCentre,
}: {
  rows: RegisterRow[];
  showCentre: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("a");

  const [sorting, setSorting] = React.useState<SortingState>([
    // Worst residual risk first. A register that opens sorted by date buries
    // the thing the manager came to find.
    { id: "residual", desc: true },
  ]);
  const [filters, setFilters] = React.useState<RegisterFilters>(emptyFilters);
  const [query, setQuery] = React.useState("");

  const open = React.useCallback(
    (id: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("a", id);
      const href = `?${next.toString()}` as Route;
      // The register → detail transition is a View Transition where the
      // browser supports one; the shared tile chip is what the eye was
      // already tracking when the row was clicked.
      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        (document as Document & { startViewTransition: (cb: () => void) => void })
          .startViewTransition(() => router.push(href, { scroll: false }));
      } else {
        router.push(href, { scroll: false });
      }
    },
    [params, router],
  );

  const columns = React.useMemo<ColumnDef<RegisterRow>[]>(
    () => [
      {
        id: "reference",
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-data-xs text-muted">
            {row.original.reference}
          </span>
        ),
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Assessment",
        cell: ({ row }) => (
          <span className="block max-w-[18rem] truncate font-medium text-ink">
            {row.original.title}
          </span>
        ),
      },
      ...(showCentre
        ? [
            {
              id: "centre",
              accessorKey: "centreName",
              header: "Centre",
              cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="grid size-5 shrink-0 place-items-center bg-surface-sunk stencil text-stencil-xs text-muted"
                  >
                    {row.original.centreCode}
                  </span>
                  <span className="max-w-[9rem] truncate text-ink-soft">
                    {row.original.centreName}
                  </span>
                </span>
              ),
            } satisfies ColumnDef<RegisterRow>,
          ]
        : []),
      {
        id: "assessor",
        accessorKey: "assessorName",
        header: "Assessor",
        cell: ({ row }) => (
          <span className="block max-w-[8rem] truncate text-ink-soft">
            {row.original.assessorName}
          </span>
        ),
      },
      {
        id: "initial",
        accessorFn: (row) => row.initialScore,
        header: "Initial",
        cell: ({ row }) =>
          row.original.findingCount > 0 ? (
            <TileChip
              likelihood={row.original.initialLikelihood}
              severity={row.original.initialSeverity}
              size="sm"
            />
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        id: "residual",
        accessorFn: (row) => row.residualScore,
        header: "Residual",
        cell: ({ row }) =>
          row.original.findingCount > 0 ? (
            <span
              // The shared element for the register → detail transition.
              style={{ viewTransitionName: `risk-${row.original.id}` }}
              className="inline-block"
            >
              <TileChip
                likelihood={row.original.residualLikelihood}
                severity={row.original.residualSeverity}
                showPosition
              />
            </span>
          ) : (
            <span className="text-muted">No findings yet</span>
          ),
      },
      {
        id: "findings",
        accessorKey: "findingCount",
        header: "Findings",
        cell: ({ row }) => (
          <span className="font-mono text-data-xs text-ink-soft">
            {row.original.findingCount}
            {row.original.openActions > 0 ? (
              <span className="text-muted"> · {row.original.openActions} open</span>
            ) : null}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const meta = STATUS_META[row.original.status];
          return (
            <span
              className={cn(
                "inline-block rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                meta.chip,
              )}
            >
              {meta.label}
            </span>
          );
        },
      },
      {
        id: "review",
        accessorFn: (row) => (row.reviewDueAt ? Date.parse(row.reviewDueAt) : Infinity),
        header: "Review due",
        cell: ({ row }) => {
          const state = row.original.reviewState;
          return (
            <span className="block">
              <span className="block font-mono text-data-xs text-ink-soft">
                {formatDate(row.original.reviewDueAt)}
              </span>
              <span
                className={cn(
                  "block text-ui-sm",
                  state === "overdue" ? "text-risk-5-ink" : "text-muted",
                )}
              >
                {reviewLabel(row.original.reviewDueAt)}
              </span>
            </span>
          );
        },
      },
    ],
    [showCentre],
  );

  const filtered = React.useMemo(
    () => rows.filter((row) => matchesFilters(row, filters, query)),
    [rows, filters, query],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const bodyRows = table.getRowModel().rows;

  // Arrow-key navigation over rows, Enter to open. The register is fully
  // keyboard operable, which for a table means the rows are, not just the
  // header controls.
  const onRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, index: number) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = index + (event.key === "ArrowDown" ? 1 : -1);
      const target = event.currentTarget.parentElement?.children[next];
      if (target instanceof HTMLElement) target.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(bodyRows[index]!.original.id);
    }
  };

  return (
    <div>
      <FilterBar
        rows={rows}
        filters={filters}
        onFiltersChange={setFilters}
        query={query}
        onQueryChange={setQuery}
        showCentre={showCentre}
        shown={filtered.length}
        total={rows.length}
      />

      <div className="relative overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-ui-sm">
          <caption className="sr-only">
            Risk assessment register. {filtered.length} of {rows.length} assessments
            shown, sorted by {sorting[0]?.id ?? "residual risk"}.
          </caption>
          {/* Sticky goes on the cells, not on <thead>: a sticky thead inside a
              horizontally scrolling container makes the whole page scroll
              sideways in Chromium, which breaks the layout at 375px. */}
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                      }
                      className="sticky top-0 z-20 border-b border-rule bg-surface-raised px-2.5 py-2 text-left align-bottom whitespace-nowrap"
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        // The eyebrow is 12px tall; the negative margin buys a
                        // 24px hit area (WCAG 2.2 SC 2.5.8) without moving the
                        // header or changing the row height.
                        className="eyebrow -my-1.5 inline-flex min-h-6 items-center gap-1 py-1.5 hover:text-ink"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp aria-hidden className="size-3" />
                        ) : sorted === "desc" ? (
                          <ArrowDown aria-hidden className="size-3" />
                        ) : (
                          <ChevronsUpDown aria-hidden className="size-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {bodyRows.map((row, index) => {
              const isSelected = row.original.id === selectedId;
              const isOverdue = row.original.reviewState === "overdue";
              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  aria-current={isSelected || undefined}
                  onClick={() => open(row.original.id)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                  className={cn(
                    "group cursor-pointer transition-colors duration-[var(--duration-quick)]",
                    isSelected ? "bg-accent-wash" : "hover:bg-surface-sunk",
                  )}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "border-b border-rule px-2.5 py-2 align-middle",
                        // Overdue is marked by a left edge-rule: visually
                        // distinct without being alarming, and it survives a
                        // greyscale printout.
                        cellIndex === 0 &&
                          (isOverdue
                            ? "border-l-2 border-l-risk-5 pl-2"
                            : "border-l-2 border-l-transparent pl-2"),
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {bodyRows.length === 0 ? (
        <p className="px-4 py-12 text-center text-ui text-muted">
          No assessments match these filters.{" "}
          <button
            type="button"
            onClick={() => {
              setFilters(emptyFilters);
              setQuery("");
            }}
            className="text-accent underline decoration-accent-line underline-offset-4"
          >
            Clear them
          </button>{" "}
          to see the whole register.
        </p>
      ) : null}
    </div>
  );
}
