import type { CentreFigure } from "@/lib/data/reports";
import { BAND_META } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * The cross-centre comparison table.
 *
 * The reason the vocabulary is controlled: with free-text hazards none of
 * these columns could be compared. Every numeric column is in the data role
 * with tabular figures, so the eye can run down it.
 *
 * This doubles as the table view the charts' colour needs — no figure on this
 * page depends on colour to be read.
 */
export function ComparisonTable({
  centres,
  variant = "screen",
}: {
  centres: CentreFigure[];
  /**
   * A4 cannot hold nine columns, and on paper the table clips rather than
   * scrolling. The print variant keeps only what an insurer reads down the
   * column — overdue, high risk, worst residual, and the initial → residual
   * reduction, which the brief rightly calls the most persuasive number. The
   * assessment and finding counts are dropped because the page header and
   * footer already state them.
   */
  variant?: "screen" | "print";
}) {
  const full = variant === "screen";
  const totals = centres.reduce(
    (acc, c) => ({
      assessments: acc.assessments + c.assessments,
      findings: acc.findings + c.findings,
      overdue: acc.overdue + c.overdue,
      dueSoon: acc.dueSoon + c.dueSoon,
      openActions: acc.openActions + c.openActions,
      openHighRiskActions: acc.openHighRiskActions + c.openHighRiskActions,
    }),
    {
      assessments: 0,
      findings: 0,
      overdue: 0,
      dueSoon: 0,
      openActions: 0,
      openHighRiskActions: 0,
    },
  );

  return (
    <div className="relative overflow-x-auto print-keep">
      <table
        className={cn(
          "w-full border-separate border-spacing-0",
          // On paper the eyebrow's letter-spacing is what pushes the last
          // columns off the page, so print headers wrap and track normally.
          full ? "text-ui-sm" : "text-[8pt]",
        )}
      >
        <caption className="sr-only">
          Risk assessment figures compared across every centre in the group.
        </caption>
        <thead>
          <tr>
            <Th align="left" wrap={!full}>Centre</Th>
            {full ? <Th>Assessments</Th> : null}
            {full ? <Th>Findings</Th> : null}
            <Th wrap={!full}>Overdue</Th>
            {full ? <Th wrap={!full}>Due soon</Th> : null}
            {full ? <Th wrap={!full}>Actions</Th> : null}
            <Th wrap={!full}>High risk</Th>
            <Th wrap={!full}>Worst</Th>
            <Th wrap={!full}>Reduction</Th>
          </tr>
        </thead>
        <tbody>
          {centres.map((centre) => (
            <tr key={centre.centreId} className="hover:bg-surface-sunk">
              <td className="border-b border-rule px-2.5 py-2">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="grid size-5 shrink-0 place-items-center bg-surface-sunk stencil text-[0.625rem] text-muted"
                  >
                    {centre.centreCode}
                  </span>
                  <span className="whitespace-nowrap text-ink">{centre.centreName}</span>
                </span>
              </td>
              {full ? <Td>{centre.assessments}</Td> : null}
              {full ? <Td>{centre.findings}</Td> : null}
              <Td emphasis={centre.overdue > 0}>{centre.overdue}</Td>
              {full ? <Td>{centre.dueSoon}</Td> : null}
              {full ? <Td>{centre.openActions}</Td> : null}
              <Td emphasis={centre.openHighRiskActions > 0}>
                {centre.openHighRiskActions}
              </Td>
              <td className="border-b border-rule px-2.5 py-2 text-right">
                {centre.worstBand ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-6 shrink-0 place-items-center stencil text-ui-sm",
                        BAND_META[centre.worstBand].fill,
                      )}
                    >
                      {centre.worstResidual}
                    </span>
                    <span className="text-ui-sm text-muted">
                      {BAND_META[centre.worstBand].label}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <Td>{centre.meanReductionPct}%</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-2.5 py-2 font-medium text-ink">
              {centres.length === 1 ? "Total" : "Group total"}
            </td>
            {full ? <Td foot>{totals.assessments}</Td> : null}
            {full ? <Td foot>{totals.findings}</Td> : null}
            <Td foot>{totals.overdue}</Td>
            {full ? <Td foot>{totals.dueSoon}</Td> : null}
            {full ? <Td foot>{totals.openActions}</Td> : null}
            <Td foot>{totals.openHighRiskActions}</Td>
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "right",
  wrap = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  wrap?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "eyebrow border-b border-rule bg-surface-raised px-2.5 py-2 align-bottom",
        wrap ? "whitespace-normal tracking-normal" : "whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  emphasis,
  foot,
}: {
  children: React.ReactNode;
  emphasis?: boolean;
  foot?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-2.5 py-2 text-right font-mono text-data-xs",
        foot ? "font-medium text-ink" : "border-b border-rule",
        emphasis ? "text-risk-5-ink" : foot ? "" : "text-ink-soft",
      )}
    >
      {children}
    </td>
  );
}
