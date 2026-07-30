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
export function ComparisonTable({ centres }: { centres: CentreFigure[] }) {
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
      <table className="w-full border-separate border-spacing-0 text-ui-sm">
        <caption className="sr-only">
          Risk assessment figures compared across every centre in the group.
        </caption>
        <thead>
          <tr>
            <Th align="left">Centre</Th>
            <Th>Assessments</Th>
            <Th>Findings</Th>
            <Th>Overdue</Th>
            <Th>Due soon</Th>
            <Th>Open actions</Th>
            <Th>High-risk open</Th>
            <Th>Worst residual</Th>
            <Th>Mean reduction</Th>
          </tr>
        </thead>
        <tbody>
          {centres.map((centre) => (
            <tr key={centre.centreId} className="hover:bg-surface-sunk">
              <td className="border-b border-rule px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="grid size-5 shrink-0 place-items-center bg-surface-sunk stencil text-[0.625rem] text-muted"
                  >
                    {centre.centreCode}
                  </span>
                  <span className="text-ink">{centre.centreName}</span>
                </span>
              </td>
              <Td>{centre.assessments}</Td>
              <Td>{centre.findings}</Td>
              <Td emphasis={centre.overdue > 0}>{centre.overdue}</Td>
              <Td>{centre.dueSoon}</Td>
              <Td>{centre.openActions}</Td>
              <Td emphasis={centre.openHighRiskActions > 0}>
                {centre.openHighRiskActions}
              </Td>
              <td className="border-b border-rule px-3 py-2 text-right">
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
                  <span className="text-faint">—</span>
                )}
              </td>
              <Td>{centre.meanReductionPct}%</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-3 py-2 font-medium text-ink">
              {centres.length === 1 ? "Total" : "Group total"}
            </td>
            <Td foot>{totals.assessments}</Td>
            <Td foot>{totals.findings}</Td>
            <Td foot>{totals.overdue}</Td>
            <Td foot>{totals.dueSoon}</Td>
            <Td foot>{totals.openActions}</Td>
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
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "eyebrow border-b border-rule bg-surface-raised px-3 py-2 align-bottom whitespace-nowrap",
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
        "px-3 py-2 text-right font-mono text-data-xs",
        foot ? "font-medium text-ink" : "border-b border-rule",
        emphasis ? "text-risk-5-ink" : foot ? "" : "text-ink-soft",
      )}
    >
      {children}
    </td>
  );
}
