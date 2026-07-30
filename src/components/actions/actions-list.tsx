"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import type { ActionListRow } from "@/lib/data/actions";
import { ACTION_STATE_META } from "@/lib/vocab";
import { bandMeta } from "@/lib/risk";
import { cn, formatDate, initials, reviewLabel } from "@/lib/utils";
import { closeAction, reopenAction } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";

interface Group {
  ownerName: string;
  ownerId: string | null;
  rows: ActionListRow[];
}

/**
 * Actions grouped by owner. Tight rows like the register — this is a Check
 * surface, not an authoring one — but each row carries enough context
 * (hazard, residual score, centre, assessment) to act without opening
 * anything.
 */
export function ActionsList({
  groups,
  currentUserId,
}: {
  groups: Group[];
  currentUserId: string;
}) {
  const [mineOnly, setMineOnly] = React.useState(false);

  const shown = mineOnly
    ? groups.filter((g) => g.ownerId === currentUserId)
    : groups;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-surface px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => setMineOnly((v) => !v)}
          aria-pressed={mineOnly}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-ui-sm transition-colors duration-[var(--duration-quick)]",
            mineOnly
              ? "border-ink bg-ink text-surface-raised"
              : "border-rule-strong bg-surface-raised text-muted hover:text-ink",
          )}
        >
          Assigned to me
        </button>
        <p className="font-mono text-data-xs text-muted">
          {shown.reduce((n, g) => n + g.rows.length, 0)} actions
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-12 text-center text-ui text-muted">
          Nothing is assigned to you. Good news, or a sign the actions need owners.
        </p>
      ) : (
        shown.map((group) => (
          <OwnerGroup key={group.ownerId ?? "unassigned"} group={group} />
        ))
      )}
    </div>
  );
}

function OwnerGroup({ group }: { group: Group }) {
  const overdue = group.rows.filter((r) => r.state === "overdue").length;

  return (
    <section>
      <h2 className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-rule bg-surface-raised px-4 py-2 sm:px-6">
        <span
          aria-hidden
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full font-mono text-stencil-xs",
            group.ownerId
              ? "bg-accent-wash text-accent-ink"
              : "border border-dashed border-rule-strong text-muted",
          )}
        >
          {group.ownerId ? initials(group.ownerName) : "?"}
        </span>
        <span className="text-ui font-medium text-ink">
          {group.ownerId ? group.ownerName : "Unassigned"}
        </span>
        <span className="font-mono text-data-xs text-muted">
          {group.rows.length}
          {overdue > 0 ? (
            <span className="text-risk-5-ink"> · {overdue} overdue</span>
          ) : null}
        </span>
      </h2>

      <ul>
        {group.rows.map((row) => (
          <ActionRow key={row.id} row={row} />
        ))}
      </ul>
    </section>
  );
}

function ActionRow({ row }: { row: ActionListRow }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const meta = ACTION_STATE_META[row.state];
  const band = bandMeta(row.residualScore);

  return (
    <li
      className={cn(
        "border-b border-rule px-4 py-2.5 sm:px-6",
        row.state === "overdue" && "border-l-2 border-l-risk-5",
        row.state === "closed" && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center stencil text-ui-sm",
            band.fill,
          )}
        >
          {row.residualScore}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-ui text-ink",
              row.state === "closed" && "line-through decoration-muted",
            )}
          >
            {row.description}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-sm text-muted">
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center bg-surface-sunk stencil text-stencil-xs"
            >
              {row.centreCode}
            </span>
            <span>{row.hazardLabel}</span>
            <span aria-hidden>·</span>
            <Link
              href={`/register?a=${row.assessmentId}`}
              className="font-mono text-data-xs text-accent hover:underline"
            >
              {row.assessmentRef}
            </Link>
            <span className="sr-only">
              Risk {row.residualScore}, {band.label.toLowerCase()}.
            </span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-data-xs text-ink-soft">
            {row.closedAt ? formatDate(row.closedAt) : formatDate(row.dueAt)}
          </p>
          <span
            className={cn(
              "mt-0.5 inline-block rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
              meta.chip,
            )}
          >
            {row.state === "closed" ? "Closed" : reviewLabel(row.dueAt)}
          </span>
        </div>

        <div className="shrink-0">
          {row.closedAt ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await reopenAction(row.id);
                setPending(false);
                if (!result.ok) {
                  toast.error(result.error ?? "That action could not be reopened.");
                  return;
                }
                router.refresh();
              }}
            >
              <RotateCcw aria-hidden />
              Reopen
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setClosing((v) => !v)}>
              <Check aria-hidden />
              Close
            </Button>
          )}
        </div>
      </div>

      {closing ? (
        <form
          action={async (formData) => {
            setPending(true);
            const result = await closeAction(formData);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error ?? "That action could not be closed.");
              return;
            }
            toast.success("Action closed.");
            setClosing(false);
            router.refresh();
          }}
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-rule pt-3"
        >
          <input type="hidden" name="id" value={row.id} />
          <label className="min-w-48 flex-1">
            <span className="eyebrow block">What was done</span>
            <input
              name="closureNote"
              autoFocus
              placeholder="Matting fitted along the deep-end walkway"
              className="mt-1 h-9 w-full rounded-[var(--radius)] border border-rule-strong bg-surface-raised px-2.5 text-ui text-ink placeholder:text-muted focus:border-accent"
            />
          </label>
          <Button type="submit" variant="ink" size="sm" disabled={pending}>
            {pending ? "Closing…" : "Close action"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setClosing(false)}>
            Cancel
          </Button>
        </form>
      ) : null}
    </li>
  );
}
