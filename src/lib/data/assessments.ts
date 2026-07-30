import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  headlineInitialScore,
  headlineResidualScore,
  needsAction,
  riskBand,
  riskScore,
  type RiskBand,
} from "@/lib/risk";
import { reviewState, type ReviewState } from "@/lib/utils";
import type {
  ActionRow,
  AssessmentRow,
  CentreRow,
  FindingRow,
  ProfileRow,
  RevisionRow,
} from "@/lib/db/types";
import type { AssessmentStatus, HazardCategory } from "@/lib/vocab";
import { lookupMaps } from "@/lib/data/library";

/** One row of the register — everything the table needs, already derived. */
export interface RegisterRow {
  id: string;
  reference: string;
  title: string;
  status: AssessmentStatus;
  centreId: string;
  centreName: string;
  centreCode: string;
  assessorName: string;
  reviewDueAt: string | null;
  reviewState: ReviewState;
  findingCount: number;
  initialScore: number;
  residualScore: number;
  initialLikelihood: number;
  initialSeverity: number;
  residualLikelihood: number;
  residualSeverity: number;
  band: RiskBand | null;
  openActions: number;
  signedOffAt: string | null;
}

/**
 * The register. One query per table rather than a nested select, because
 * PostgREST embedding on four levels produces a payload far larger than the
 * three flat reads it replaces.
 *
 * `centreId` of null is the group-level view.
 */
export const getRegister = cache(
  async (centreId: string | null): Promise<RegisterRow[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("assessment")
      .select("*")
      .order("created_at", { ascending: false });
    if (centreId) query = query.eq("centre_id", centreId);

    const { data: assessments } = await query;
    if (!assessments || assessments.length === 0) return [];

    const ids = assessments.map((a) => a.id);

    const [{ data: findings }, { data: centres }, { data: profiles }, { data: actions }] =
      await Promise.all([
        supabase
          .from("finding")
          .select(
            "id, assessment_id, likelihood, severity, residual_likelihood, residual_severity",
          )
          .in("assessment_id", ids),
        supabase.from("centre").select("*"),
        supabase.from("profile").select("id, full_name"),
        supabase
          .from("action")
          .select("id, finding_id, closed_at")
          .is("closed_at", null),
      ]);

    const centreById = new Map((centres ?? []).map((c) => [c.id, c]));
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const byAssessment = new Map<string, typeof findings>();
    const assessmentOfFinding = new Map<string, string>();
    for (const f of findings ?? []) {
      const list = byAssessment.get(f.assessment_id) ?? [];
      list.push(f);
      byAssessment.set(f.assessment_id, list);
      assessmentOfFinding.set(f.id, f.assessment_id);
    }

    const openByAssessment = new Map<string, number>();
    for (const a of actions ?? []) {
      const assessmentId = assessmentOfFinding.get(a.finding_id);
      if (!assessmentId) continue;
      openByAssessment.set(assessmentId, (openByAssessment.get(assessmentId) ?? 0) + 1);
    }

    return assessments.map((a) => {
      const rows = byAssessment.get(a.id) ?? [];
      const centre = centreById.get(a.centre_id);

      // The headline is the worst finding, not the mean. A register row must
      // surface the worst thing in the document — averaging hides a 25
      // behind a page of 2s.
      const initialScore = headlineInitialScore(rows);
      const residualScore = headlineResidualScore(rows);
      const worstInitial =
        rows.find((f) => riskScore(f.likelihood, f.severity) === initialScore) ?? null;
      const worstResidual =
        rows.find(
          (f) => riskScore(f.residual_likelihood, f.residual_severity) === residualScore,
        ) ?? null;

      return {
        id: a.id,
        reference: a.reference,
        title: a.title,
        status: a.status,
        centreId: a.centre_id,
        centreName: centre?.name ?? "Unknown centre",
        centreCode: centre?.code ?? "??",
        assessorName: a.assessor_id
          ? (nameById.get(a.assessor_id) ?? "Unassigned")
          : "Unassigned",
        reviewDueAt: a.review_due_at,
        reviewState: reviewState(a.review_due_at),
        findingCount: rows.length,
        initialScore,
        residualScore,
        initialLikelihood: worstInitial?.likelihood ?? 0,
        initialSeverity: worstInitial?.severity ?? 0,
        residualLikelihood: worstResidual?.residual_likelihood ?? 0,
        residualSeverity: worstResidual?.residual_severity ?? 0,
        band: residualScore > 0 ? riskBand(residualScore) : null,
        openActions: openByAssessment.get(a.id) ?? 0,
        signedOffAt: a.signed_off_at,
      } satisfies RegisterRow;
    });
  },
);

export interface FindingDetail extends FindingRow {
  hazardLabel: string;
  hazardCategory: HazardCategory;
  hazardGuidance: string | null;
  controls: { id: string; label: string }[];
  actions: ActionRow[];
  initialScore: number;
  residualScore: number;
  needsAction: boolean;
}

export interface AssessmentDetail {
  assessment: AssessmentRow;
  centre: CentreRow | null;
  assessor: ProfileRow | null;
  signedOffBy: ProfileRow | null;
  reviewedBy: ProfileRow | null;
  templateName: string | null;
  findings: FindingDetail[];
  revisions: RevisionRow[];
  headlineInitial: number;
  headlineResidual: number;
  openActions: number;
}

/** One assessment, fully hydrated — the document view and the PDF share this. */
export const getAssessment = cache(
  async (id: string): Promise<AssessmentDetail | null> => {
    const supabase = await createClient();

    const { data: assessment } = await supabase
      .from("assessment")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!assessment) return null;

    const [
      { data: findings },
      { data: centre },
      { data: profiles },
      { data: revisions },
      { data: template },
      maps,
    ] = await Promise.all([
      supabase
        .from("finding")
        .select("*")
        .eq("assessment_id", id)
        .order("sort_order"),
      supabase.from("centre").select("*").eq("id", assessment.centre_id).maybeSingle(),
      supabase.from("profile").select("*"),
      supabase
        .from("revision")
        .select("*")
        .eq("assessment_id", id)
        .order("revision_no", { ascending: false }),
      assessment.template_id
        ? supabase
            .from("template")
            .select("name")
            .eq("id", assessment.template_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      lookupMaps(),
    ]);

    const findingIds = (findings ?? []).map((f) => f.id);
    const { data: actions } = findingIds.length
      ? await supabase
          .from("action")
          .select("*")
          .in("finding_id", findingIds)
          .order("due_at", { nullsFirst: false })
      : { data: [] as ActionRow[] };

    const actionsByFinding = new Map<string, ActionRow[]>();
    for (const action of actions ?? []) {
      const list = actionsByFinding.get(action.finding_id) ?? [];
      list.push(action);
      actionsByFinding.set(action.finding_id, list);
    }

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const detail: FindingDetail[] = (findings ?? []).map((f) => {
      const hazard = maps.hazardById.get(f.hazard_id);
      const residualScore = riskScore(f.residual_likelihood, f.residual_severity);
      return {
        ...f,
        hazardLabel: hazard?.label ?? "Unknown hazard",
        hazardCategory: hazard?.category ?? "Physical",
        hazardGuidance: hazard?.guidance ?? null,
        controls: f.control_measure_ids
          .map((cid) => maps.controlById.get(cid))
          .filter((c): c is NonNullable<typeof c> => Boolean(c))
          .map((c) => ({ id: c.id, label: c.label })),
        actions: actionsByFinding.get(f.id) ?? [],
        initialScore: riskScore(f.likelihood, f.severity),
        residualScore,
        needsAction: needsAction(residualScore),
      };
    });

    return {
      assessment,
      centre: centre ?? null,
      assessor: assessment.assessor_id
        ? (profileById.get(assessment.assessor_id) ?? null)
        : null,
      signedOffBy: assessment.signed_off_by
        ? (profileById.get(assessment.signed_off_by) ?? null)
        : null,
      reviewedBy: assessment.reviewed_by
        ? (profileById.get(assessment.reviewed_by) ?? null)
        : null,
      templateName: template?.name ?? null,
      findings: detail,
      revisions: revisions ?? [],
      headlineInitial: headlineInitialScore(detail),
      headlineResidual: headlineResidualScore(detail),
      openActions: (actions ?? []).filter((a) => !a.closed_at).length,
    };
  },
);
