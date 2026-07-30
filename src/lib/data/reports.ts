import { cache } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
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
  /** Mean residual score of findings on assessments signed off up to that month. */
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
  async (centreId: string | null): Promise<ReportData> => {
    const supabase = await createClient();

    const [{ data: centres }, { data: assessments }, { data: findings }, { data: actions }] =
      await Promise.all([
        supabase.from("centre").select("*").order("name"),
        supabase.from("assessment").select("*"),
        supabase
          .from("finding")
          .select(
            "id, assessment_id, likelihood, severity, residual_likelihood, residual_severity",
          ),
        supabase.from("action").select("id, finding_id, centre_id, closed_at, due_at"),
      ]);

    const scoped = (assessments ?? []).filter(
      (a) => (!centreId || a.centre_id === centreId) && a.status !== "archived",
    );
    const scopedIds = new Set(scoped.map((a) => a.id));
    const scopedFindings = (findings ?? []).filter((f) => scopedIds.has(f.assessment_id));

    const assessmentOfFinding = new Map(
      (findings ?? []).map((f) => [f.id, f.assessment_id]),
    );
    const findingById = new Map((findings ?? []).map((f) => [f.id, f]));

    const openActions = (actions ?? []).filter(
      (a) => !a.closed_at && (!centreId || a.centre_id === centreId),
    );

    // ---- figure 1 & 2, per centre --------------------------------
    const visibleCentres = (centres ?? []).filter((c) => !centreId || c.id === centreId);

    const centreFigures: CentreFigure[] = visibleCentres.map((centre) => {
      const own = scoped.filter((a) => a.centre_id === centre.id);
      const ownIds = new Set(own.map((a) => a.id));
      const ownFindings = scopedFindings.filter((f) => ownIds.has(f.assessment_id));

      const ownOpenActions = openActions.filter((a) => a.centre_id === centre.id);
      const openHighRisk = ownOpenActions.filter((a) => {
        const finding = findingById.get(a.finding_id);
        if (!finding) return false;
        return isHighRisk(
          riskScore(finding.residual_likelihood, finding.residual_severity),
        );
      });

      let worstResidual = 0;
      let reductionSum = 0;
      for (const f of ownFindings) {
        const initial = riskScore(f.likelihood, f.severity);
        const residual = riskScore(f.residual_likelihood, f.residual_severity);
        if (residual > worstResidual) worstResidual = residual;
        reductionSum += initial > 0 ? ((initial - residual) / initial) * 100 : 0;
      }

      return {
        centreId: centre.id,
        centreName: centre.name,
        centreCode: centre.code,
        assessments: own.length,
        overdue: own.filter((a) => reviewState(a.review_due_at) === "overdue").length,
        dueSoon: own.filter((a) => reviewState(a.review_due_at) === "due_soon").length,
        openHighRiskActions: openHighRisk.length,
        openActions: ownOpenActions.length,
        findings: ownFindings.length,
        worstResidual,
        worstBand: worstResidual > 0 ? riskBand(worstResidual) : null,
        meanReductionPct:
          ownFindings.length > 0 ? Math.round(reductionSum / ownFindings.length) : 0,
      };
    });

    // ---- figure 3, severity trend over time ----------------------
    // Bucketed by the month an assessment was signed off. A finding counts
    // from its sign-off month onward, so the line reads as "where the
    // register stood then", not "what was authored that month".
    const months: TrendPoint[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const cutoff = startOfMonth(subMonths(now, i - 1));

      const live = scoped.filter(
        (a) => a.signed_off_at && new Date(a.signed_off_at) < cutoff,
      );
      const liveIds = new Set(live.map((a) => a.id));
      const liveFindings = scopedFindings.filter((f) => liveIds.has(f.assessment_id));

      const scores = liveFindings.map((f) =>
        riskScore(f.residual_likelihood, f.residual_severity),
      );

      months.push({
        month: format(monthStart, "yyyy-MM"),
        label: format(monthStart, "MMM"),
        meanResidual:
          scores.length > 0
            ? Math.round((scores.reduce((n, v) => n + v, 0) / scores.length) * 10) / 10
            : 0,
        highRiskFindings: scores.filter(isHighRisk).length,
      });
    }

    // ---- where risk clusters -------------------------------------
    const matrixCounts: Record<string, number> = {};
    for (const f of scopedFindings) {
      const key = `${f.residual_likelihood}-${f.residual_severity}`;
      matrixCounts[key] = (matrixCounts[key] ?? 0) + 1;
    }

    const highRiskOpen = openActions.filter((a) => {
      const finding = findingById.get(a.finding_id);
      if (!finding) return false;
      if (!assessmentOfFinding.has(a.finding_id)) return false;
      return isHighRisk(riskScore(finding.residual_likelihood, finding.residual_severity));
    });

    return {
      centres: centreFigures,
      trend: months,
      matrixCounts,
      totals: {
        assessments: scoped.length,
        overdue: scoped.filter((a) => reviewState(a.review_due_at) === "overdue").length,
        openHighRiskActions: highRiskOpen.length,
        findings: scopedFindings.length,
        signedOff: scoped.filter((a) => a.status === "signed_off").length,
      },
      generatedAt: new Date().toISOString(),
    };
  },
);
