"use client";

import { Check, CircleAlert, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * The autosave indicator settles rather than flashes.
 *
 * There is no Save button in the authoring flow — one can be forgotten
 * mid-walk, and a half-recorded assessment is worse than none. So this is
 * the only signal an assessor has that the work is safe, and it says which
 * of the three states it is in without making them watch it.
 */
export function AutosaveIndicator({
  state,
  error,
  className,
}: {
  state: SaveState;
  error?: string;
  className?: string;
}) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-ui-sm",
        state === "error" ? "text-risk-5-ink" : "text-muted",
        className,
      )}
    >
      {state === "saving" ? (
        <>
          <RotateCw aria-hidden className="size-3.5 shrink-0 animate-spin" />
          Saving
        </>
      ) : state === "saved" ? (
        <span
          className="flex items-center gap-1.5 [animation:settle_var(--duration-settle)_var(--ease-settle)]"
          key="saved"
        >
          <Check aria-hidden className="size-3.5 shrink-0 text-accent" />
          Saved
        </span>
      ) : state === "error" ? (
        <>
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          {error ?? "Not saved. Check your connection and try again."}
        </>
      ) : (
        <span className="text-faint">Changes save as you go</span>
      )}
    </p>
  );
}
