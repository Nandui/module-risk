import type { Metadata } from "next";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { requireSession } from "@/lib/data/session";
import { getReportData } from "@/lib/data/reports";
import { PageHeader } from "@/components/shell/page-header";
import { SeverityTrend } from "@/components/reports/report-charts";
import {
  CentreStack,
  ComparisonTable,
} from "@/components/reports/comparison-table";
import { VerdictMasthead } from "@/components/reports/verdict-masthead";
import { TileMatrixHeat } from "@/components/risk/tile-matrix";
import { BandKey } from "@/components/risk/tile-chip";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

/**
 * The Report job, composed as signage rather than as a dashboard.
 *
 * One verdict, one comparison, one trend, one distribution — in that order,
 * each with room around it. The previous layout opened with three equal metric
 * cards over three near-empty charts and closed with five more figures, two of
 * which restated numbers from the top of the page. Twelve numbers competed and
 * none led.
 *
 * Optimised for defensibility: every number here traces to a signed record,
 * and the PDF is the artefact an inspector actually reads.
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

      {/* The answer, before any of the evidence for it. */}
      <VerdictMasthead centres={data.centres} totals={data.totals} />

      <div className="space-y-16 px-4 py-12 sm:px-6">
        {/* ---- the focal element ---------------------------------- */}
        <section aria-labelledby="comparison" className="space-y-4">
          <div>
            <h2
              id="comparison"
              className="font-display text-title font-bold tracking-tight text-ink"
            >
              Every centre, side by side
            </h2>
            <p className="mt-1.5 max-w-measure text-ui text-muted">
              Comparable because hazards and controls come from one shared
              library. Free-text records could not be lined up like this — it is
              the reason the vocabulary is controlled.
            </p>
          </div>
          {/* One of these is display:none, so only one is in the a11y tree. */}
          <div className="hidden lg:block">
            <ComparisonTable centres={data.centres} />
          </div>
          <CentreStack centres={data.centres} className="lg:hidden" />
        </section>

        {/* ---- the one series with a shape ------------------------ */}
        <section aria-labelledby="trend" className="max-w-3xl space-y-4">
          <div>
            <h2
              id="trend"
              className="font-display text-title-sm font-bold tracking-tight text-ink"
            >
              Mean residual risk, twelve months
            </h2>
            <p className="mt-1.5 text-ui text-muted">
              Across every finding on an assessment signed off up to that month.
            </p>
          </div>
          <SeverityTrend trend={data.trend} />
        </section>

        {/* ---- the signature -------------------------------------- */}
        <section
          aria-labelledby="distribution"
          className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start lg:gap-12"
        >
          <div className="space-y-4">
            <div>
              <h2
                id="distribution"
                className="font-display text-title-sm font-bold tracking-tight text-ink"
              >
                Where residual risk sits
              </h2>
              <p className="mt-1.5 text-ui text-muted">
                Every finding at its matrix position, after controls. Severity
                climbs to the right, likelihood upward.
              </p>
            </div>
            <TileMatrixHeat counts={data.matrixCounts} />
          </div>

          <p className="max-w-measure text-ui text-muted lg:pt-1">
            A cluster low and left is a well-controlled operation. Anything in
            the top-right corner is a finding whose controls have not moved it,
            and is the first thing an inspector will ask about.
          </p>
        </section>

        <footer className="space-y-3 border-t border-rule pt-5">
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
