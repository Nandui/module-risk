"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/data/reports";

/**
 * One chart. Not three.
 *
 * There were two bar charts here as well — overdue by centre, and high-risk
 * actions by centre. Both plotted one or two bars of value 1 against a 0–4
 * axis, and both restated a column the comparison table already carries per
 * centre. A chart that holds three numbers is a decoration of a number, and
 * on a page an inspector reads, decoration costs credibility. They are gone;
 * the table holds those figures.
 *
 * What survives is the only series with a shape worth drawing: mean residual
 * over twelve months. It is drawn in the one brand teal and needs no legend —
 * the heading names the series. The risk ramp is deliberately absent, because
 * it means severity and a line of means is not a severity scale.
 */

const AXIS = {
  stroke: "var(--color-rule-strong)",
  tick: { fill: "var(--color-muted)", fontSize: 11 },
} as const;

/** Text wears text tokens; the value is in the data role. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius)] border border-rule bg-surface-raised px-2.5 py-1.5">
      <p className="text-ui-sm text-ink">{label}</p>
      <p className="font-mono text-data-xs text-muted">
        {payload[0]?.value} mean residual score
      </p>
    </div>
  );
}

export function SeverityTrend({ trend }: { trend: TrendPoint[] }) {
  const latest = trend[trend.length - 1];
  const first = trend.find((p) => p.meanResidual > 0);
  const direction =
    latest && first && latest.meanResidual !== first.meanResidual
      ? latest.meanResidual < first.meanResidual
        ? "down"
        : "up"
      : "flat";

  const note =
    direction === "down"
      ? `Down from ${first?.meanResidual ?? 0} — controls are reducing risk`
      : direction === "up"
        ? `Up from ${first?.meanResidual ?? 0} — worth explaining in the next review`
        : "Unchanged across the period";

  return (
    <figure className="print-keep">
      <figcaption className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="stencil text-figure text-ink">
          {latest?.meanResidual ?? 0}
        </span>
        <span className="text-ui text-muted">{note}</span>
      </figcaption>
      <div
        className="mt-5"
        role="img"
        aria-label={`Mean residual risk over 12 months. ${note}.`}
      >
        {/* One measure, one axis. The count of high-risk findings is a
            different scale and lives in the comparison table, not on a
            second y-axis. */}
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid
              stroke="var(--color-rule)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis dataKey="label" {...AXIS} tickLine={false} interval="preserveStartEnd" />
            <YAxis
              {...AXIS}
              tickLine={false}
              width={30}
              domain={[0, 25]}
              ticks={[0, 5, 10, 15, 20, 25]}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--color-rule-strong)" }}
            />
            <Line
              type="monotone"
              dataKey="meanResidual"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--color-accent)",
                stroke: "var(--color-surface-raised)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
