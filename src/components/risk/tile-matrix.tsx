"use client";

import * as React from "react";
import {
  BAND_META,
  buildMatrix,
  describeCell,
  LIKELIHOOD_DESCRIPTIONS,
  LIKELIHOOD_LABELS,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  bandMeta,
} from "@/lib/risk";
import { cn } from "@/lib/utils";

const MATRIX = buildMatrix();

export interface MatrixValue {
  likelihood: number;
  severity: number;
}

/**
 * The risk matrix, rendered as poolside tile.
 *
 * Square corners against an otherwise softly-rounded interface, 2px ruled
 * gaps in the rule colour, stencilled numerals. You tap into a cell — there
 * are no dropdowns. The selected cell physically raises.
 *
 * Fully keyboard operable: the grid is a single tab stop, arrow keys walk
 * it, Enter and Space commit. Every cell names its likelihood, severity,
 * score and band in words, so risk level is never carried by colour alone.
 */
export function TileMatrix({
  value,
  onChange,
  labelledBy,
  disabled = false,
  className,
}: {
  value: MatrixValue | null;
  onChange: (value: MatrixValue) => void;
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
}) {
  // Roving focus. Starts on the selection, or at the centre of the grid so
  // the first arrow press moves somewhere sensible.
  const [focus, setFocus] = React.useState<MatrixValue>(
    value ?? { likelihood: 3, severity: 3 },
  );
  const gridRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value) setFocus(value);
  }, [value]);

  const move = (dl: number, ds: number) => {
    const likelihood = clamp(focus.likelihood + dl);
    const severity = clamp(focus.severity + ds);
    setFocus({ likelihood, severity });
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${likelihood}-${severity}"]`)
      ?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        move(1, 0);
        break;
      case "ArrowDown":
        event.preventDefault();
        move(-1, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        move(0, 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        move(0, -1);
        break;
      case "Home":
        event.preventDefault();
        setFocus({ likelihood: 1, severity: 1 });
        break;
      case "End":
        event.preventDefault();
        setFocus({ likelihood: 5, severity: 5 });
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onChange(focus);
        break;
      default:
    }
  };

  const selected = value;
  const score = selected ? selected.likelihood * selected.severity : null;
  const meta = score ? bandMeta(score) : null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-stretch gap-2">
        {/* Likelihood axis — ascends upward, as every printed matrix does. */}
        <div
          aria-hidden
          className="flex w-6 shrink-0 items-center justify-center"
        >
          <span className="eyebrow -rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">
            Likelihood
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={gridRef}
            role="grid"
            aria-labelledby={labelledBy}
            aria-readonly={disabled || undefined}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className="grid ruled grid-cols-[1.5rem_repeat(5,minmax(0,1fr))]"
          >
            {MATRIX.map((row) => {
              const likelihood = row[0]!.likelihood;
              return (
                <React.Fragment key={likelihood}>
                  <div
                    role="rowheader"
                    aria-hidden
                    title={LIKELIHOOD_DESCRIPTIONS[likelihood - 1]}
                    className="grid place-items-center bg-surface-raised stencil text-data-xs text-muted"
                  >
                    {likelihood}
                  </div>
                  {row.map((cell) => {
                    const isSelected =
                      selected?.likelihood === cell.likelihood &&
                      selected?.severity === cell.severity;
                    const isFocus =
                      focus.likelihood === cell.likelihood &&
                      focus.severity === cell.severity;
                    const band = BAND_META[cell.band];

                    return (
                      <button
                        key={cell.severity}
                        type="button"
                        role="gridcell"
                        data-cell={`${cell.likelihood}-${cell.severity}`}
                        aria-selected={isSelected}
                        aria-label={describeCell(cell.likelihood, cell.severity)}
                        tabIndex={isFocus ? 0 : -1}
                        disabled={disabled}
                        onClick={() => onChange({ likelihood: cell.likelihood, severity: cell.severity })}
                        onFocus={() => setFocus({ likelihood: cell.likelihood, severity: cell.severity })}
                        className={cn(
                          // Square. Deliberately not rounded.
                          "relative grid aspect-square place-items-center transition-[transform,box-shadow] duration-[var(--duration-quick)] ease-[var(--ease-settle)]",
                          band.fill,
                          !disabled && "cursor-pointer",
                          // Unselected cells sit back so the ramp reads as a
                          // field of tile rather than 25 competing swatches.
                          !isSelected && "opacity-70 hover:opacity-100",
                          // The selected cell physically raises.
                          isSelected &&
                            "z-10 -translate-y-[3px] opacity-100 shadow-[0_3px_0_0_var(--color-ink)] ring-2 ring-ink ring-inset",
                        )}
                      >
                        <span
                          className={cn(
                            "stencil tabular-nums",
                            isSelected ? "text-ui-lg" : "text-ui-sm",
                          )}
                        >
                          {cell.score}
                        </span>
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Severity axis numerals along the foot of the grid. */}
            <div aria-hidden className="bg-surface-raised" />
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                aria-hidden
                title={SEVERITY_DESCRIPTIONS[s - 1]}
                className="grid h-6 place-items-center bg-surface-raised stencil text-data-xs text-muted"
              >
                {s}
              </div>
            ))}
          </div>

          <p aria-hidden className="eyebrow mt-2 text-center">
            Severity
          </p>
        </div>
      </div>

      {/* The selection, spelled out. Colour is never the only carrier. */}
      <div
        aria-live="polite"
        className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule pt-2.5 text-ui-sm"
      >
        {selected && meta ? (
          <>
            <span className="stencil text-title-sm text-ink">{score}</span>
            <span className={cn("font-medium", meta.ink)}>{meta.label}</span>
            <span className="text-muted">
              {LIKELIHOOD_LABELS[selected.likelihood - 1]} ×{" "}
              {SEVERITY_LABELS[selected.severity - 1]}
            </span>
          </>
        ) : (
          <span className="text-muted">
            Tap a cell to set likelihood and severity.
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The same tile, read-only, marking one position. Used in the assessment
 * document and in the PDF, where nothing is selectable but the reader still
 * needs to see where the finding sits.
 */
export function TileMatrixStatic({
  value,
  className,
}: {
  value: MatrixValue;
  className?: string;
}) {
  return (
    <div
      className={cn("grid ruled w-fit grid-cols-5 print-keep", className)}
      role="img"
      aria-label={describeCell(value.likelihood, value.severity)}
    >
      {MATRIX.map((row) =>
        row.map((cell) => {
          const isHere =
            cell.likelihood === value.likelihood && cell.severity === value.severity;
          const band = BAND_META[cell.band];
          return (
            <div
              key={`${cell.likelihood}-${cell.severity}`}
              className={cn(
                "grid size-6 place-items-center",
                band.fill,
                isHere
                  ? "z-10 stencil text-data-xs ring-2 ring-ink ring-inset"
                  : "opacity-45",
              )}
            >
              {isHere ? cell.score : ""}
            </div>
          );
        }),
      )}
    </div>
  );
}

/**
 * A count heat-map over the same grid — how many findings sit in each cell.
 * Used on the reports screen, where the question is where a centre's risk
 * clusters rather than what one finding scored.
 */
export function TileMatrixHeat({
  counts,
  className,
}: {
  counts: Record<string, number>;
  className?: string;
}) {
  const total = Object.values(counts).reduce((n, v) => n + v, 0);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid ruled grid-cols-5" role="img"
        aria-label={`Distribution of ${total} findings across the risk matrix.`}>
        {MATRIX.map((row) =>
          row.map((cell) => {
            const n = counts[`${cell.likelihood}-${cell.severity}`] ?? 0;
            const band = BAND_META[cell.band];
            return (
              <div
                key={`${cell.likelihood}-${cell.severity}`}
                title={`${describeCell(cell.likelihood, cell.severity)} ${n} findings.`}
                className={cn(
                  "grid aspect-square place-items-center stencil text-ui-sm",
                  band.fill,
                  n === 0 && "opacity-25",
                )}
              >
                {n > 0 ? n : ""}
              </div>
            );
          }),
        )}
      </div>
      <p className="eyebrow text-center">Likelihood ↑ · Severity →</p>
    </div>
  );
}

function clamp(n: number): number {
  return Math.min(5, Math.max(1, n));
}
