import type { CentreFigure, ReportData } from "@/lib/data/reports";
import { BAND_META } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * The verdict. One block, one figure, one sentence.
 *
 * A group H&S lead opens this page to answer a single question — which centre
 * is the problem, and can I show we are managing it. Everything below is
 * evidence for the answer; this states the answer.
 *
 * Built as statutory signage rather than as a metric card: a band-coloured
 * block, a numeral at capacity-notice scale, and a plain sentence. The group's
 * standing figures sit under it as one demoted line, which is also why they
 * appear exactly once on this page — the previous layout printed the overdue
 * count and the high-risk action count twice each.
 */
export function VerdictMasthead({
  centres,
  totals,
}: {
  centres: CentreFigure[];
  totals: ReportData["totals"];
}) {
  // The worst centre by residual score, not by count of problems: one finding
  // at 20 outranks nine at 6, and an inspector reads it that way too.
  const worst = centres.reduce<CentreFigure | null>(
    (acc, c) => (c.worstBand && (!acc || c.worstResidual > acc.worstResidual) ? c : acc),
    null,
  );

  if (!worst || !worst.worstBand) {
    return (
      <section className="border-b border-rule-strong px-4 py-10 sm:px-6">
        <p className="eyebrow">Group position</p>
        <p className="mt-3 max-w-measure font-display text-title font-bold text-ink">
          No signed-off findings yet, so there is nothing to report.
        </p>
        <p className="mt-2 max-w-measure text-ui text-muted">
          Figures appear here once an assessment is signed off. Drafts are
          deliberately excluded — this page is evidence, not work in progress.
        </p>
      </section>
    );
  }

  const meta = BAND_META[worst.worstBand];

  return (
    <section
      aria-labelledby="verdict"
      className="border-b border-rule-strong px-4 py-10 sm:px-6"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* The signage numeral. Square, band-filled, its own text colour —
            dark on bands 1–4, white on band 5, the ISO 7010 crossover.
            aria-hidden because the heading beside it already states the
            score and the band in words; announcing both is a stutter. */}
        <div
          aria-hidden
          className={cn(
            "grid size-28 shrink-0 place-items-center stencil text-signage",
            meta.fill,
          )}
        >
          {worst.worstResidual}
        </div>

        <div className="min-w-0">
          <p className="eyebrow">Group position</p>
          <h2
            id="verdict"
            className="mt-2 max-w-measure font-display text-title font-bold leading-tight tracking-tight text-ink"
          >
            {/* One string, not mixed JSX children: a value followed by text
                across a line break loses the space between them, and it is
                invisible in the source. */}
            {`${worst.centreName} carries the group’s highest residual risk, at ${worst.worstResidual} — ${meta.label.toLowerCase()}.`}
          </h2>

          <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <Standing
              label="Reviews overdue"
              value={totals.overdue}
              alarming={totals.overdue > 0}
            />
            <Standing
              label="Open high-risk actions"
              value={totals.openHighRiskActions}
              alarming={totals.openHighRiskActions > 0}
            />
            <Standing label="Assessments signed off" value={totals.signedOff} />
            <Standing label="Findings recorded" value={totals.findings} />
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * A standing figure. Deliberately one tier below the verdict numeral: the
 * label is demoted to the eyebrow role and the value sits at title-sm, so the
 * eye reaches the block above first and these second.
 */
function Standing({
  label,
  value,
  alarming,
}: {
  label: string;
  value: number;
  alarming?: boolean;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={cn(
          "mt-1 stencil text-title-sm",
          alarming ? "text-risk-5-ink" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
