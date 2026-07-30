import { cache } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { query } from "@/lib/data/session";
import { isHighRisk, riskBand, riskScore, type RiskBand } from "@/lib/risk";
import { reviewState } from "@/lib/utils";

/**
 * Three figures only, plus one comparison table and one trend line. The brief
 * is explicit about this and it is the right call — a group H&S lead showing
 * evidence to an insurer needs a page they can defend, not twelve donuts.
 */

export interface CentreFigure {
  centreId: string;
  centreName: string;
  centreCode: string;
  assessments: number;
  overdue: number;
  dueSoon: number;
  openHighRiskActions: number;
  openActions: number;
  findings: number;
  worstResidual: number;
  worstBand: RiskBand | null;
  /** Mean cut from initial → residual across the centre's findings. */
  meanReductionPct: number;
}

export interface TrendPoint {
  month: string;
  label: string;
  /** Mean residual of findings on assessments signed off up to that month. */
  meanResidual: number;
  highRiskFindings: number;
}

export interface ReportData {
  centres: CentreFigure[];
  trend: TrendPoint[];
  matrixCounts: Record<string, number>;
  totals: {
    assessments: number;
    overdue: number;
    openHighRiskActions: number;
    findings: number;
    signedOff: number;
  };
  generatedAt: string;
}

export const getReportData = cache(
  (centreId: string | null): Promise<ReportData> =>
    query(async (tx) => {
      const [centres, assessments] = await Promise.all([
        tx.centre.findMany({
          where: centreId ? { id: centreId } : undefined,
          orderBy: { name: "asc" },
        }),
        tx.assessment.findMany({
          where: {
            status: { not: "archived" },
            ...(centreId ? { centreId } : {}),
          },
          select: {
            id: true,
            centreId: true,
            status: true,
            reviewDueAt: true,
            signedOffAt: true,
            findings: {
              select: {
                likelihood: true,
                severity: true,
                residualLikelihood: true,
                residualSeverity: true,
                actions: {
                  where: { closedAt: null },
                  select: { id: true },
                },
              },
            },
          },
        }),
      ]);

      const allFindings = assessments.flatMap((a) => a.findings);

      // ---- figures 1 & 2, per centre ----------------------------
      const centreFigures: CentreFigure[] = centres.map((centre) => {
        const own = assessments.filter((a) => a.centreId === centre.id);
        const ownFindings = own.flatMap((a) => a.findings);

        let worstResidual = 0;
        let reductionSum = 0;
        let openActions = 0;
        let openHighRisk = 0;

        for (const f of ownFindings) {
          const initial = riskScore(f.likelihood, f.severity);
          const residual = riskScore(f.residualLikelihood, f.residualSeverity);
          if (residual > worstResidual) worstResidual = residual;
          reductionSum += initial > 0 ? ((initial - residual) / initial) * 100 : 0;
          openActions += f.actions.length;
          if (isHighRisk(residual)) openHighRisk += f.actions.length;
        }

        return {
          centreId: centre.id,
          centreName: centre.name,
          centreCode: centre.code,
          assessments: own.length,
          overdue: own.filter((a) => reviewState(a.reviewDueAt) === "overdue").length,
          dueSoon: own.filter((a) => reviewState(a.reviewDueAt) === "due_soon").length,
          openHighRiskActions: openHighRisk,
          openActions,
          findings: ownFindings.length,
          worstResidual,
          worstBand: worstResidual > 0 ? riskBand(worstResidual) : null,
          meanReductionPct:
            ownFindings.length > 0 ? Math.round(reductionSum / ownFindings.length) : 0,
        };
      });

      // ---- figure 3, severity trend over time -------------------
      // Bucketed by the month an assessment was signed off. A finding counts
      // from its sign-off month onward, so the line reads as "where the
      // register stood then", not "what was authored that month".
      const trend: TrendPoint[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const cutoff = startOfMonth(subMonths(now, i - 1));

        const live = assessments.filter(
          (a) => a.signedOffAt && a.signedOffAt < cutoff,
        );
        const scores = live
          .flatMap((a) => a.findings)
          .map((f) => riskScore(f.residualLikelihood, f.residualSeverity));

        trend.push({
          month: format(monthStart, "yyyy-MM"),
          label: format(monthStart, "MMM"),
          meanResidual:
            scores.length > 0
              ? Math.round((scores.reduce((n, v) => n + v, 0) / scores.length) * 10) / 10
              : 0,
          highRiskFindings: scores.filter(isHighRisk).length,
        });
      }

      // ---- where risk clusters ----------------------------------
      const matrixCounts: Record<string, number> = {};
      for (const f of allFindings) {
        const key = `${f.residualLikelihood}-${f.residualSeverity}`;
        matrixCounts[key] = (matrixCounts[key] ?? 0) + 1;
      }

      return {
        centres: centreFigures,
        trend,
        matrixCounts,
        totals: {
          assessments: assessments.length,
          overdue: assessments.filter((a) => reviewState(a.reviewDueAt) === "overdue")
            .length,
          openHighRiskActions: centreFigures.reduce(
            (n, c) => n + c.openHighRiskActions,
            0,
          ),
          findings: allFindings.length,
          signedOff: assessments.filter((a) => a.status === "signed_off").length,
        },
        generatedAt: new Date().toISOString(),
      };
    }),
);
