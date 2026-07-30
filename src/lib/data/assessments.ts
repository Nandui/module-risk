import { cache } from "react";
import type {
  Action,
  Assessment,
  Centre,
  Finding,
  HazardCategory,
  Revision,
} from "@prisma/client";
import { query } from "@/lib/data/session";
import type { AppProfile } from "@/lib/db";
import {
  headlineInitialScore,
  headlineResidualScore,
  needsAction,
  riskBand,
  riskScore,
  type RiskBand,
} from "@/lib/risk";
import { reviewState, type ReviewState } from "@/lib/utils";
import type { AssessmentStatus } from "@/lib/vocab";

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
 * The register. `centreId` of null is the group-level view.
 *
 * One query with the relations Prisma can nest, rather than four flat reads
 * stitched in memory — the join is what a relational database is for, and
 * RLS applies to the nested selects too.
 */
export const getRegister = cache(
  (centreId: string | null): Promise<RegisterRow[]> =>
    query(async (tx) => {
      const assessments = await tx.assessment.findMany({
        where: centreId ? { centreId } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          centre: { select: { name: true, code: true } },
          assessor: { select: { fullName: true } },
          findings: {
            select: {
              likelihood: true,
              severity: true,
              residualLikelihood: true,
              residualSeverity: true,
              _count: { select: { actions: true } },
              actions: { where: { closedAt: null }, select: { id: true } },
            },
          },
        },
      });

      return assessments.map((a) => {
        // The headline is the worst finding, not the mean. A register row
        // must surface the worst thing in the document — averaging hides a
        // 25 behind a page of 2s.
        const initialScore = headlineInitialScore(
          a.findings.map((f) => ({ likelihood: f.likelihood, severity: f.severity })),
        );
        const residualScore = headlineResidualScore(
          a.findings.map((f) => ({
            residual_likelihood: f.residualLikelihood,
            residual_severity: f.residualSeverity,
          })),
        );
        const worstInitial = a.findings.find(
          (f) => riskScore(f.likelihood, f.severity) === initialScore,
        );
        const worstResidual = a.findings.find(
          (f) => riskScore(f.residualLikelihood, f.residualSeverity) === residualScore,
        );

        return {
          id: a.id,
          reference: a.reference,
          title: a.title,
          status: a.status,
          centreId: a.centreId,
          centreName: a.centre.name,
          centreCode: a.centre.code,
          assessorName: a.assessor?.fullName ?? "Unassigned",
          reviewDueAt: a.reviewDueAt?.toISOString() ?? null,
          reviewState: reviewState(a.reviewDueAt),
          findingCount: a.findings.length,
          initialScore,
          residualScore,
          initialLikelihood: worstInitial?.likelihood ?? 0,
          initialSeverity: worstInitial?.severity ?? 0,
          residualLikelihood: worstResidual?.residualLikelihood ?? 0,
          residualSeverity: worstResidual?.residualSeverity ?? 0,
          band: residualScore > 0 ? riskBand(residualScore) : null,
          openActions: a.findings.reduce((n, f) => n + f.actions.length, 0),
          signedOffAt: a.signedOffAt?.toISOString() ?? null,
        } satisfies RegisterRow;
      });
    }),
);

export interface FindingDetail extends Finding {
  hazardLabel: string;
  hazardCategory: HazardCategory;
  hazardGuidance: string | null;
  controls: { id: string; label: string }[];
  actions: Action[];
  initialScore: number;
  residualScore: number;
  needsAction: boolean;
}

export interface AssessmentDetail {
  assessment: Assessment;
  centre: Centre | null;
  assessor: AppProfile | null;
  signedOffBy: AppProfile | null;
  reviewedBy: AppProfile | null;
  templateName: string | null;
  findings: FindingDetail[];
  revisions: Revision[];
  headlineInitial: number;
  headlineResidual: number;
  openActions: number;
}

/** One assessment, fully hydrated — the document view and the PDF share this. */
export const getAssessment = cache(
  (id: string): Promise<AssessmentDetail | null> =>
    query(async (tx) => {
      const assessment = await tx.assessment.findUnique({
        where: { id },
        include: {
          centre: true,
          assessor: true,
          signedOffBy: true,
          reviewedBy: true,
          template: { select: { name: true } },
          revisions: { orderBy: { revisionNo: "desc" } },
          findings: {
            orderBy: { sortOrder: "asc" },
            include: {
              hazard: { select: { label: true, category: true, guidance: true } },
              actions: { orderBy: { dueAt: "asc" } },
            },
          },
        },
      });
      if (!assessment) return null;

      // Control labels come from one lookup rather than a join per finding:
      // control_measure_ids is an array column, so there is no relation to
      // traverse, and the union across findings is a handful of rows.
      const controlIds = [
        ...new Set(assessment.findings.flatMap((f) => f.controlMeasureIds)),
      ];
      const controls = controlIds.length
        ? await tx.controlMeasure.findMany({
            where: { id: { in: controlIds } },
            select: { id: true, label: true },
          })
        : [];
      const controlById = new Map(controls.map((c) => [c.id, c]));

      const findings: FindingDetail[] = assessment.findings.map((f) => {
        const residualScore = riskScore(f.residualLikelihood, f.residualSeverity);
        return {
          ...f,
          hazardLabel: f.hazard.label,
          hazardCategory: f.hazard.category,
          hazardGuidance: f.hazard.guidance,
          controls: f.controlMeasureIds
            .map((cid) => controlById.get(cid))
            .filter((c): c is NonNullable<typeof c> => Boolean(c)),
          actions: f.actions,
          initialScore: riskScore(f.likelihood, f.severity),
          residualScore,
          needsAction: needsAction(residualScore),
        };
      });

      return {
        assessment,
        centre: assessment.centre,
        assessor: assessment.assessor,
        signedOffBy: assessment.signedOffBy,
        reviewedBy: assessment.reviewedBy,
        templateName: assessment.template?.name ?? null,
        findings,
        revisions: assessment.revisions,
        headlineInitial: headlineInitialScore(
          findings.map((f) => ({ likelihood: f.likelihood, severity: f.severity })),
        ),
        headlineResidual: headlineResidualScore(
          findings.map((f) => ({
            residual_likelihood: f.residualLikelihood,
            residual_severity: f.residualSeverity,
          })),
        ),
        openActions: findings.reduce(
          (n, f) => n + f.actions.filter((a) => !a.closedAt).length,
          0,
        ),
      };
    }),
);

/** Everyone who can own an action or sign something off. */
export const listPeople = cache(
  (): Promise<AppProfile[]> =>
    query((tx) =>
      tx.profile.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
    ),
);
