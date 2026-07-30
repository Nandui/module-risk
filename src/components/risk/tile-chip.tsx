import * as React from "react";
import { bandMeta, riskScore, BAND_META, RISK_BANDS } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * The matrix, carried into the register.
 *
 * A square tile at the finding's matrix position, showing the score numeral
 * with the likelihood × severity coordinate beside it. Two per row (initial
 * and residual). Scanning down the chip columns reveals the pattern of risk
 * across a centre at a glance, and the initial → residual step-down is
 * visible without reading a number.
 *
 * Colour + numeral, always. Never colour alone.
 */
export function TileChip({
  likelihood,
  severity,
  showPosition = false,
  size = "md",
  className,
}: {
  likelihood: number;
  severity: number;
  /** Show the L×S coordinate in the data role beside the tile. */
  showPosition?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const score = riskScore(likelihood, severity);
  const meta = bandMeta(score);

  return (
    <span className={cn("inline-flex items-center gap-1.5 align-middle", className)}>
      <span
        className={cn(
          // Square corners: this is a tile, not a badge.
          "grid shrink-0 place-items-center stencil",
          meta.fill,
          size === "sm" ? "size-5 text-data-xs" : "size-7 text-ui-sm",
        )}
      >
        {score}
      </span>
      {showPosition ? (
        <span className="font-mono text-data-xs text-muted">
          {likelihood}×{severity}
        </span>
      ) : null}
      <span className="sr-only">
        Risk {score}, {meta.label.toLowerCase()}, likelihood {likelihood} severity{" "}
        {severity}.
      </span>
    </span>
  );
}

/**
 * Initial → residual as one unit. The delta is the most persuasive number in
 * any report, so it is shown rather than left to be worked out.
 */
export function RiskDelta({
  likelihood,
  severity,
  residualLikelihood,
  residualSeverity,
  className,
}: {
  likelihood: number;
  severity: number;
  residualLikelihood: number;
  residualSeverity: number;
  className?: string;
}) {
  const initial = riskScore(likelihood, severity);
  const residual = riskScore(residualLikelihood, residualSeverity);
  const cut = initial - residual;

  // `flex`, not `inline-flex`: a stack of these must actually stack. An
  // inline-flex span ignores the parent's vertical rhythm and runs them
  // together on one line.
  return (
    <span className={cn("flex w-fit items-center gap-2", className)}>
      <TileChip likelihood={likelihood} severity={severity} size="sm" />
      <span aria-hidden className="text-muted">
        →
      </span>
      <TileChip likelihood={residualLikelihood} severity={residualSeverity} />
      {cut > 0 ? (
        // Percent, not the absolute cut — it is the more persuasive number and
        // it matches how the reduction is stated everywhere else.
        <span className="font-mono text-data-xs text-muted">
          −{Math.round((cut / initial) * 100)}%
          <span className="sr-only">
            {" "}
            reduction from {initial} to {residual}
          </span>
        </span>
      ) : (
        <span className="font-mono text-data-xs text-muted">no change</span>
      )}
    </span>
  );
}

/**
 * A band label with its tile. Used where the score matters less than the
 * band — filter chips, report legends, the key on a PDF.
 */
export function BandBadge({
  band,
  className,
}: {
  band: 1 | 2 | 3 | 4 | 5;
  className?: string;
}) {
  const meta = BAND_META[band];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-0.5 text-ui-sm",
        meta.chip,
        className,
      )}
    >
      <span className={cn("grid size-4 shrink-0 place-items-center stencil text-stencil-xs", meta.fill)}>
        {band}
      </span>
      {meta.label}
    </span>
  );
}

/**
 * The five-band key. Every screen that shows risk colour can show this, so
 * the ramp is never presented without its words.
 */
export function BandKey({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      <span className="eyebrow">Risk band</span>
      {RISK_BANDS.map((band) => {
        const meta = BAND_META[band];
        return (
          <span key={band} className="inline-flex items-center gap-1.5 text-ui-sm">
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center stencil text-stencil-xs",
                meta.fill,
              )}
            >
              {band}
            </span>
            <span className="text-ink-soft">{meta.label}</span>
            <span className="font-mono text-data-xs text-muted">{meta.range}</span>
          </span>
        );
      })}
    </div>
  );
}
