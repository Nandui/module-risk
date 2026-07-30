import type { Metadata } from "next";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { requireSession } from "@/lib/data/session";
import { getReportData } from "@/lib/data/reports";
import { PageHeader } from "@/components/shell/page-header";
import {
  HighRiskActionsByCentre,
  OverdueByCentre,
  SeverityTrend,
} from "@/components/reports/report-charts";
import { ComparisonTable } from "@/components/reports/comparison-table";
import { TileMatrixHeat } from "@/components/risk/tile-matrix";
import { BandKey } from "@/components/risk/tile-chip";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

/**
 * The Report job. Three figures, one comparison table, one trend line.
 *
 * Optimised for defensibility: every number on this page can be traced to a
 * signed record, and the PDF is the artefact an inspector actually reads.
 */
export default async function ReportsPage() {
  const session = await requireSession();
  const data = await getReportData(session.centreId);

  return (
    <>
      <PageHeader
        eyebrow={session.centre ? session.centre.name : "All centres"}
        title="Reports"
        description="Evidence for insurers and inspectors, drawn from signed-off assessments."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/api/reports/pdf" prefetch={false}>
              <FileDown aria-hidden />
              Export PDF
            </Link>
          </Button>
        }
      />

      <div className="space-y-10 px-4 py-6 sm:px-6">
        {/* ---- the three figures ---------------------------------- */}
        <section className="grid gap-4 lg:grid-cols-3">
          <OverdueByCentre centres={data.centres} />
          <HighRiskActionsByCentre centres={data.centres} />
          <SeverityTrend trend={data.trend} />
        </section>

        {/* ---- the comparison table ------------------------------- */}
        <section className="space-y-3">
          <div>
            <h2 className="eyebrow">Cross-centre comparison</h2>
            <p className="mt-1 text-ui text-muted">
              Comparable because hazards and controls come from one shared
              library. Free-text records could not be lined up like this.
            </p>
          </div>
          <ComparisonTable centres={data.centres} />
        </section>

        {/* ---- where risk clusters -------------------------------- */}
        <section className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
          <div className="space-y-3">
            <div>
              <h2 className="eyebrow">Where residual risk sits</h2>
              <p className="mt-1 max-w-prose text-ui text-muted">
                Every finding at its matrix position, after controls.
              </p>
            </div>
            <div className="max-w-xs">
              <TileMatrixHeat counts={data.matrixCounts} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-l-0 lg:border-l lg:border-rule lg:pl-8">
            <Stat label="Assessments" value={data.totals.assessments} />
            <Stat label="Signed off" value={data.totals.signedOff} />
            <Stat label="Findings recorded" value={data.totals.findings} />
            <Stat
              label="Overdue reviews"
              value={data.totals.overdue}
              emphasis={data.totals.overdue > 0}
            />
            <Stat
              label="Open high-risk actions"
              value={data.totals.openHighRiskActions}
              emphasis={data.totals.openHighRiskActions > 0}
            />
          </dl>
        </section>

        <footer className="space-y-3 border-t border-rule pt-4">
          <BandKey />
          <p className="font-mono text-data-xs text-muted">
            Generated {formatDateTime(data.generatedAt)} · Risk score is
            likelihood (1–5) × severity (1–5)
          </p>
        </footer>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={
          emphasis
            ? "mt-1 stencil text-title text-risk-5-ink"
            : "mt-1 stencil text-title text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}
