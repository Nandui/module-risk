"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CentreFigure, TrendPoint } from "@/lib/data/reports";

/**
 * The three report figures. Nothing else.
 *
 * Each is a single series, so each is drawn in the one brand teal and needs
 * no legend — the title names the series. The risk ramp is deliberately
 * absent from these charts: it means severity and nothing else, and a bar
 * chart of counts is not a severity scale.
 *
 * Recessive axes, no gridline fill, no vertical gridlines, hairline rules.
 * A hover tooltip on every figure, because an HTML chart is interactive.
 */

const AXIS = {
  stroke: "var(--color-rule-strong)",
  tick: { fill: "var(--color-muted)", fontSize: 11 },
} as const;

/** Shared tooltip. Text wears text tokens; the value is in the data role. */
function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius)] border border-rule bg-surface-raised px-2.5 py-1.5">
      <p className="text-ui-sm text-ink">{label}</p>
      <p className="font-mono text-data-xs text-muted">
        {payload[0]?.value} {unit}
      </p>
    </div>
  );
}

export function OverdueByCentre({ centres }: { centres: CentreFigure[] }) {
  const data = centres.map((c) => ({
    name: c.centreCode,
    full: c.centreName,
    overdue: c.overdue,
  }));

  return (
    <Figure
      label="Assessments overdue"
      title="Overdue by centre"
      total={centres.reduce((n, c) => n + c.overdue, 0)}
      note="Past the review date set at sign-off"
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid
            stroke="var(--color-rule)"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis dataKey="name" {...AXIS} tickLine={false} />
          <YAxis {...AXIS} tickLine={false} allowDecimals={false} width={28} />
          <Tooltip
            content={<ChartTooltip unit="overdue" />}
            cursor={{ fill: "var(--color-surface-sunk)" }}
          />
          <Bar
            dataKey="overdue"
            fill="var(--color-accent)"
            // Thin marks with a 4px rounded data-end anchored to the baseline.
            maxBarSize={28}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export function HighRiskActionsByCentre({ centres }: { centres: CentreFigure[] }) {
  const data = centres.map((c) => ({
    name: c.centreCode,
    full: c.centreName,
    actions: c.openHighRiskActions,
  }));

  return (
    <Figure
      label="Open high-risk actions"
      title="High-risk actions by centre"
      total={centres.reduce((n, c) => n + c.openHighRiskActions, 0)}
      note="Open actions on findings in band 4 or 5"
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-rule)" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="name" {...AXIS} tickLine={false} />
          <YAxis {...AXIS} tickLine={false} allowDecimals={false} width={28} />
          <Tooltip
            content={<ChartTooltip unit="open actions" />}
            cursor={{ fill: "var(--color-surface-sunk)" }}
          />
          <Bar
            dataKey="actions"
            fill="var(--color-accent)"
            maxBarSize={28}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Figure>
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

  return (
    <Figure
      label="Severity trend"
      title="Mean residual risk over 12 months"
      total={latest?.meanResidual ?? 0}
      note={
        direction === "down"
          ? `Down from ${first?.meanResidual ?? 0} — controls are reducing risk`
          : direction === "up"
            ? `Up from ${first?.meanResidual ?? 0} — worth explaining in the next review`
            : "Unchanged across the period"
      }
    >
      {/* One measure, one axis. The count of high-risk findings is a different
          scale and lives in the comparison table, not on a second y-axis. */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-rule)" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="label" {...AXIS} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            {...AXIS}
            tickLine={false}
            width={30}
            domain={[0, 25]}
            ticks={[0, 5, 10, 15, 20, 25]}
          />
          <Tooltip
            content={<ChartTooltip unit="mean residual score" />}
            cursor={{ stroke: "var(--color-rule-strong)" }}
          />
          <Line
            type="monotone"
            dataKey="meanResidual"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--color-accent)", stroke: "var(--color-surface-raised)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Figure>
  );
}

/**
 * A figure: eyebrow, headline number, plot, one line of interpretation.
 *
 * The number is the point; the plot is the evidence for it. A group H&S lead
 * quoting this to an insurer needs the figure, not a shape.
 */
function Figure({
  label,
  title,
  total,
  note,
  children,
}: {
  label: string;
  title: string;
  total: number;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="border border-rule bg-surface-raised p-4 print-keep">
      <figcaption>
        <p className="eyebrow">{label}</p>
        <p className="mt-1.5 stencil text-figure text-ink">{total}</p>
        <p className="mt-0.5 text-ui-sm text-muted">{note}</p>
      </figcaption>
      <div className="mt-4" role="img" aria-label={`${title}. ${note}.`}>
        {children}
      </div>
    </figure>
  );
}
