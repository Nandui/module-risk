"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { RevisionRow } from "@/lib/db/types";
import { formatDateTime, cn } from "@/lib/utils";

/**
 * Revision history — accessible but not prominent. Collapsed by default:
 * it matters enormously when it matters, and not at all the rest of the time.
 */
export function RevisionHistory({ revisions }: { revisions: RevisionRow[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="border-t border-rule pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="eyebrow inline-flex items-center gap-1.5 hover:text-ink"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3 transition-transform duration-[var(--duration-quick)]",
            open && "rotate-90",
          )}
        />
        Revision history ({revisions.length})
      </button>

      {open ? (
        <ol className="mt-3 divide-y divide-rule border-t border-rule">
          {revisions.map((revision) => (
            <li key={revision.id} className="flex gap-3 py-2.5">
              <span className="stencil w-8 shrink-0 text-ui-sm text-muted">
                {String(revision.revision_no).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-ui text-ink-soft">
                  {revision.reason ?? "No reason recorded"}
                </span>
                <span className="mt-0.5 block font-mono text-data-xs text-faint">
                  {formatDateTime(revision.created_at)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
