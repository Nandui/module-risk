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
 *
 * On screen it is the focal element of the reports page, so it is sized like
 * one: taller rows, a real block of band colour rather than a chip, and the
 * reduction column promoted — the initial → residual cut is the most
 * persuasive number an insurer will read. The print variant is untouched;
 * A4 has different constraints and its own column set.
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
              <td className={cn("border-b border-rule px-2.5", full ? "py-3.5" : "py-2")}>
                <span className="inline-flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "grid shrink-0 place-items-center bg-surface-sunk stencil text-muted",
                      full ? "size-7 text-ui-sm" : "size-5 text-stencil-xs",
                    )}
                  >
                    {centre.centreCode}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-ink",
                      full && "font-display text-title-sm font-bold tracking-tight",
                    )}
                  >
                    {centre.centreName}
                  </span>
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
              <td
                className={cn(
                  "border-b border-rule px-2.5 text-right",
                  full ? "py-3.5" : "py-2",
                )}
              >
                {centre.worstBand ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "grid shrink-0 place-items-center stencil",
                        full ? "size-10 text-title-sm" : "size-6 text-ui-sm",
                        BAND_META[centre.worstBand].fill,
                      )}
                    >
                      {centre.worstResidual}
                    </span>
                    <span
                      className={cn(
                        "text-ui-sm",
                        full ? "text-ink" : "text-muted",
                      )}
                    >
                      {BAND_META[centre.worstBand].label}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <Td size={full ? "lead" : undefined}>{centre.meanReductionPct}%</Td>
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
  /** `lead` promotes the reduction column — the number that carries the page. */
  size,
}: {
  children: React.ReactNode;
  emphasis?: boolean;
  foot?: boolean;
  size?: "lead";
}) {
  return (
    <td
      className={cn(
        "px-2.5 py-2 text-right font-mono",
        size === "lead" ? "text-ui font-medium" : "text-data-xs",
        foot ? "font-medium text-ink" : "border-b border-rule",
        emphasis
          ? "text-risk-5-ink"
          : foot
            ? ""
            : size === "lead"
              ? "text-ink"
              : "text-ink-soft",
      )}
    >
      {children}
    </td>
  );
}

/**
 * The same comparison, stacked, for widths where the table cannot show a
 * single figure without scrolling.
 *
 * At 390px the table is 1134px wide in a 358px container: the centre name is
 * visible and every number is off-screen, which makes the focal element of
 * this page useless on a phone. Stacking is not a downgrade — it drops the
 * columns an H&S lead does not read first and keeps the four that answer
 * "which centre is the problem": worst residual, the reduction controls
 * achieved, overdue reviews, open high-risk actions.
 *
 * Rendered alongside the table with `display: none` on one of them, so only
 * one reaches the accessibility tree.
 */
export function CentreStack({
  centres,
  className,
}: {
  centres: CentreFigure[];
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-rule border-y border-rule", className)}>
      {centres.map((centre) => {
        const meta = centre.worstBand ? BAND_META[centre.worstBand] : null;
        return (
          <li key={centre.centreId} className="flex items-start gap-3.5 py-4">
            {meta ? (
              <span
                aria-hidden
                className={cn(
                  "grid size-12 shrink-0 place-items-center stencil text-title-sm",
                  meta.fill,
                )}
              >
                {centre.worstResidual}
              </span>
            ) : (
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center bg-surface-sunk stencil text-title-sm text-muted"
              >
                —
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="font-display text-title-sm font-bold tracking-tight text-ink">
                {centre.centreName}
              </p>
              <p className="mt-0.5 text-ui-sm text-muted">
                {meta
                  ? `Worst residual ${centre.worstResidual} — ${meta.label.toLowerCase()}`
                  : "No signed-off findings yet"}
              </p>

              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                <Figure label="Reduction" value={`${centre.meanReductionPct}%`} lead />
                <Figure
                  label="Overdue"
                  value={centre.overdue}
                  alarming={centre.overdue > 0}
                />
                <Figure
                  label="High risk"
                  value={centre.openHighRiskActions}
                  alarming={centre.openHighRiskActions > 0}
                />
                <Figure label="Findings" value={centre.findings} />
              </dl>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Figure({
  label,
  value,
  alarming,
  lead,
}: {
  label: string;
  value: number | string;
  alarming?: boolean;
  lead?: boolean;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-mono",
          lead ? "text-ui font-medium" : "text-ui-sm",
          alarming ? "text-risk-5-ink" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
