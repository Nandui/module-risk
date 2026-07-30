"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Search, X } from "lucide-react";
import type { ControlMeasure, Hazard, Template } from "@prisma/client";
import { CATEGORY_META, HAZARD_CATEGORIES, type HazardCategory } from "@/lib/vocab";
import { cn, plural } from "@/lib/utils";
import { reviewLibraryEntry } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";

type Tab = "hazards" | "controls" | "templates";

export function LibraryBrowser({
  hazards,
  controls,
  templates,
  canReview,
}: {
  hazards: Hazard[];
  controls: ControlMeasure[];
  templates: Template[];
  canReview: boolean;
}) {
  const params = useSearchParams();
  const highlighted = params.get("h");

  const [tab, setTab] = React.useState<Tab>("hazards");
  const [query, setQuery] = React.useState("");
  const [categories, setCategories] = React.useState<HazardCategory[]>([]);
  const [pendingOnly, setPendingOnly] = React.useState(false);

  const matches = (label: string, category: HazardCategory, state: string) => {
    if (categories.length && !categories.includes(category)) return false;
    if (pendingOnly && state !== "pending_review") return false;
    if (query.trim() && !label.toLowerCase().includes(query.trim().toLowerCase())) {
      return false;
    }
    return true;
  };

  const shownHazards = hazards.filter((h) =>
    matches(h.label, h.category, h.reviewState),
  );
  const shownControls = controls.filter((c) =>
    matches(c.label, c.category, c.reviewState),
  );

  const pendingCount =
    hazards.filter((h) => h.reviewState === "pending_review").length +
    controls.filter((c) => c.reviewState === "pending_review").length;

  return (
    <div>
      {/* ---- tabs ------------------------------------------------- */}
      <div
        role="tablist"
        aria-label="Library sections"
        className="flex gap-0 border-b border-rule bg-surface-raised px-4 sm:px-6"
      >
        {(
          [
            ["hazards", "Hazards", hazards.length],
            ["controls", "Control measures", controls.length],
            ["templates", "Templates", templates.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-ui transition-colors duration-[var(--duration-quick)]",
              tab === key
                ? "border-accent font-medium text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
            <span className="ml-1.5 font-mono text-data-xs text-faint">{count}</span>
          </button>
        ))}
      </div>

      {/* ---- filters ---------------------------------------------- */}
      {tab !== "templates" ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-surface px-4 py-2.5 sm:px-6">
          <div className="relative min-w-48 flex-1 sm:max-w-72">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === "hazards" ? "Search hazards" : "Search controls"}
              aria-label="Search the library"
              className="h-8 w-full rounded-[var(--radius)] border border-rule-strong bg-surface-raised pl-8 pr-2 text-ui-sm text-ink placeholder:text-faint focus:border-accent"
            />
          </div>

          {HAZARD_CATEGORIES.map((category) => {
            const active = categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setCategories((prev) =>
                    prev.includes(category)
                      ? prev.filter((c) => c !== category)
                      : [...prev, category],
                  )
                }
                className={cn(
                  "rounded-[3px] border px-2 py-0.5 text-ui-sm transition-colors duration-[var(--duration-quick)]",
                  active
                    ? "border-ink bg-ink text-surface-raised"
                    : "border-rule-strong bg-surface-raised text-muted hover:text-ink",
                )}
              >
                {category}
              </button>
            );
          })}

          {pendingCount > 0 ? (
            <button
              type="button"
              aria-pressed={pendingOnly}
              onClick={() => setPendingOnly((v) => !v)}
              className={cn(
                "rounded-[3px] border px-2 py-0.5 text-ui-sm transition-colors duration-[var(--duration-quick)]",
                pendingOnly
                  ? "border-accent bg-accent text-white"
                  : "border-accent-line bg-accent-wash text-accent-ink",
              )}
            >
              Awaiting review
              <span className="ml-1 font-mono text-data-xs">{pendingCount}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ---- lists ------------------------------------------------ */}
      {tab === "hazards" ? (
        <ul className="divide-y divide-rule">
          {shownHazards.map((hazard) => (
            <li
              key={hazard.id}
              className={cn(
                "px-4 py-3 sm:px-6",
                hazard.id === highlighted && "bg-accent-wash",
              )}
            >
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-ui text-ink">{hazard.label}</span>
                  {hazard.guidance ? (
                    <span className="mt-0.5 block max-w-prose text-ui-sm text-muted">
                      {hazard.guidance}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                    CATEGORY_META[hazard.category].chip,
                  )}
                >
                  {hazard.category}
                </span>
                {hazard.reviewState === "pending_review" ? (
                  <ReviewControls
                    table="hazard"
                    id={hazard.id}
                    canReview={canReview}
                  />
                ) : null}
              </div>
            </li>
          ))}
          {shownHazards.length === 0 ? <Nothing /> : null}
        </ul>
      ) : null}

      {tab === "controls" ? (
        <ul className="divide-y divide-rule">
          {shownControls.map((control) => (
            <li key={control.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 sm:px-6">
              <span className="min-w-0 flex-1 text-ui text-ink">{control.label}</span>
              <span
                className={cn(
                  "shrink-0 rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                  CATEGORY_META[control.category].chip,
                )}
              >
                {control.category}
              </span>
              {control.reviewState === "pending_review" ? (
                <ReviewControls
                  table="control_measure"
                  id={control.id}
                  canReview={canReview}
                />
              ) : null}
            </li>
          ))}
          {shownControls.length === 0 ? <Nothing /> : null}
        </ul>
      ) : null}

      {tab === "templates" ? (
        <ul className="divide-y divide-rule">
          {templates.map((template) => (
            <li key={template.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:px-6">
              <span className="min-w-0 flex-1 text-ui text-ink">{template.name}</span>
              <span className="font-mono text-data-xs text-muted">
                {template.hazardIds.length} {plural(template.hazardIds.length, "hazard")}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                  CATEGORY_META[template.category].chip,
                )}
              >
                {template.category}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReviewControls({
  table,
  id,
  canReview,
}: {
  table: "hazard" | "control_measure";
  id: string;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  if (!canReview) {
    return (
      <span className="shrink-0 rounded-[3px] border border-accent-line bg-accent-wash px-1.5 py-0.5 text-ui-sm leading-tight text-accent-ink">
        Awaiting review
      </span>
    );
  }

  const decide = async (decision: "approved" | "rejected") => {
    setPending(true);
    const result = await reviewLibraryEntry(table, id, decision);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "That could not be saved.");
      return;
    }
    toast.success(decision === "approved" ? "Added to the library." : "Rejected.");
    router.refresh();
  };

  return (
    <span className="flex shrink-0 items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void decide("approved")}
      >
        <Check aria-hidden />
        Approve
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => void decide("rejected")}
      >
        <X aria-hidden />
        Reject
      </Button>
    </span>
  );
}

function Nothing() {
  return (
    <li className="px-4 py-12 text-center text-ui text-muted">
      Nothing in the library matches those filters.
    </li>
  );
}
