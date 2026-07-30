import { requireSession } from "@/lib/data/session";
import { getReportData } from "@/lib/data/reports";
import { ComparisonTable } from "@/components/reports/comparison-table";
import { TileMatrixHeat } from "@/components/risk/tile-matrix";
import { BandKey } from "@/components/risk/tile-chip";
import { BAND_META } from "@/lib/risk";
import { formatDateTime } from "@/lib/utils";

/**
 * The report as it appears in the PDF.
 *
 * The three screen charts are deliberately replaced by the numbers they
 * encode plus the comparison table. A Recharts SVG rasterises acceptably but
 * a bar chart of three bars tells an insurer less than the three numbers do,
 * and typography survives photocopying in a way a chart does not.
 */
export default async function PrintReportPage() {
  const session = await requireSession();
  const data = await getReportData(session.centreId);
  const scope = session.centre ? session.centre.name : "All centres";

  const trendFirst = data.trend.find((p) => p.meanResidual > 0);
  const trendLast = data.trend[data.trend.length - 1];

  return (
    <div>
      <header className="mb-8 border-b-2 border-ink pb-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow !text-ink">Risk report</p>
          <p className="font-mono text-data-xs text-muted">
            {formatDateTime(data.generatedAt)}
          </p>
        </div>
        <h1 className="mt-2 font-display text-title font-bold text-ink">{scope}</h1>
        <p className="mt-1 text-ui text-muted">
          Drawn from {data.totals.signedOff} signed-off{" "}
          {data.totals.signedOff === 1 ? "assessment" : "assessments"} of{" "}
          {data.totals.assessments} on the register.
        </p>
      </header>

      {/* ---- the three figures, as figures --------------------------- */}
      <section className="mb-8 grid grid-cols-3 gap-6 print-keep">
        <PrintFigure
          label="Assessments overdue"
          value={data.totals.overdue}
          note="Past the review date set at sign-off"
        />
        <PrintFigure
          label="Open high-risk actions"
          value={data.totals.openHighRiskActions}
          note="On findings in band 4 or 5"
        />
        <PrintFigure
          label="Mean residual risk"
          value={trendLast?.meanResidual ?? 0}
          note={
            trendFirst && trendLast
              ? `${trendFirst.meanResidual} twelve months ago`
              : "No signed history yet"
          }
        />
      </section>

      {/* ---- the trend, as a table ---------------------------------- */}
      <section className="mb-8 print-keep">
        <h2 className="eyebrow mb-2">Severity trend, last 12 months</h2>
        <table className="w-full border-separate border-spacing-0 text-ui-sm">
          <caption className="sr-only">
            Mean residual risk score and count of high-risk findings by month.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="eyebrow border-b border-rule px-2 py-1 text-left">
                Month
              </th>
              {data.trend.map((point) => (
                <th
                  key={point.month}
                  scope="col"
                  className="eyebrow border-b border-rule px-1 py-1 text-right"
                >
                  {point.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="border-b border-rule px-2 py-1 text-left text-ui-sm font-normal text-ink-soft">
                Mean residual
              </th>
              {data.trend.map((point) => (
                <td
                  key={point.month}
                  className="border-b border-rule px-1 py-1 text-right font-mono text-data-xs text-ink"
                >
                  {point.meanResidual || "—"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="border-b border-rule px-2 py-1 text-left text-ui-sm font-normal text-ink-soft">
                High-risk findings
              </th>
              {data.trend.map((point) => (
                <td
                  key={point.month}
                  className="border-b border-rule px-1 py-1 text-right font-mono text-data-xs text-ink"
                >
                  {point.highRiskFindings || "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      {/* ---- cross-centre comparison -------------------------------- */}
      <section className="mb-8">
        <h2 className="eyebrow mb-2">Cross-centre comparison</h2>
        <ComparisonTable centres={data.centres} variant="print" />
      </section>

      {/* ---- where risk sits ---------------------------------------- */}
      <section className="mb-8 grid grid-cols-[auto_1fr] gap-8 print-keep">
        <div>
          <h2 className="eyebrow mb-2">Where residual risk sits</h2>
          <div className="w-48">
            <TileMatrixHeat counts={data.matrixCounts} />
          </div>
        </div>
        <div>
          <h2 className="eyebrow mb-2">Method</h2>
          <p className="text-ui-sm leading-relaxed text-ink-soft">
            Every hazard is rated for likelihood (1–5) and consequence severity
            (1–5) before controls, and again with the controls that are in place
            on site. Risk score is likelihood × severity, 1 to 25, banded into
            five levels. A residual score of 10 or above requires a documented
            action with an owner and a due date.
          </p>
          <dl className="mt-3 space-y-1 text-ui-sm">
            {[1, 2, 3, 4, 5].map((band) => {
              const meta = BAND_META[band as 1 | 2 | 3 | 4 | 5];
              return (
                <div key={band} className="flex items-baseline gap-2">
                  <dt className="w-32 shrink-0 whitespace-nowrap text-ink-soft">
                    Band {band} — {meta.label}
                  </dt>
                  <dd className="font-mono text-data-xs text-muted">{meta.range}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <footer className="border-t border-rule pt-3">
        <BandKey />
        <p className="mt-2 font-mono text-data-xs text-muted">
          {scope} · {data.totals.findings} findings across {data.totals.assessments}{" "}
          assessments · Generated {formatDateTime(data.generatedAt)}
        </p>
      </footer>
    </div>
  );
}

function PrintFigure({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="border-t-2 border-ink pt-2">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 stencil text-figure text-ink">{value}</p>
      <p className="mt-0.5 text-ui-sm text-muted">{note}</p>
    </div>
  );
}
