import { cache } from "react";
import { query } from "@/lib/data/session";
import { riskBand, riskScore, type RiskBand } from "@/lib/risk";
import { actionState } from "@/lib/utils";
import type { ActionState } from "@/lib/vocab";

export interface ActionListRow {
  id: string;
  description: string;
  dueAt: string | null;
  closedAt: string | null;
  state: ActionState;
  ownerId: string | null;
  ownerName: string;
  centreId: string;
  centreName: string;
  centreCode: string;
  assessmentId: string;
  assessmentRef: string;
  assessmentTitle: string;
  hazardLabel: string;
  residualScore: number;
  band: RiskBand;
}

/**
 * Every action across the group, or one centre. This is the screen that
 * actually gets things fixed, so it reaches across centres by default and
 * carries enough context to act without opening the assessment.
 */
export const getActions = cache(
  (centreId: string | null, includeClosed = false): Promise<ActionListRow[]> =>
    query(async (tx) => {
      const actions = await tx.action.findMany({
        where: {
          ...(centreId ? { centreId } : {}),
          ...(includeClosed ? {} : { closedAt: null }),
        },
        orderBy: { dueAt: "asc" },
        include: {
          centre: { select: { name: true, code: true } },
          owner: { select: { fullName: true } },
          finding: {
            select: {
              residualLikelihood: true,
              residualSeverity: true,
              hazard: { select: { label: true } },
              assessment: { select: { id: true, reference: true, title: true } },
            },
          },
        },
      });

      return actions.map((action) => {
        const residualScore = riskScore(
          action.finding.residualLikelihood,
          action.finding.residualSeverity,
        );
        return {
          id: action.id,
          description: action.description,
          dueAt: action.dueAt?.toISOString() ?? null,
          closedAt: action.closedAt?.toISOString() ?? null,
          state: actionState({
            due_at: action.dueAt?.toISOString() ?? null,
            closed_at: action.closedAt?.toISOString() ?? null,
          }),
          ownerId: action.ownerId,
          ownerName: action.owner?.fullName ?? "Unassigned",
          centreId: action.centreId,
          centreName: action.centre.name,
          centreCode: action.centre.code,
          assessmentId: action.finding.assessment.id,
          assessmentRef: action.finding.assessment.reference,
          assessmentTitle: action.finding.assessment.title,
          hazardLabel: action.finding.hazard.label,
          residualScore,
          band: riskBand(residualScore),
        } satisfies ActionListRow;
      });
    }),
);

/**
 * Grouped by owner, each group ordered by due date. Overdue first inside a
 * group, because that is the order the work gets picked up in.
 */
export function groupByOwner(rows: ActionListRow[]) {
  const groups = new Map<
    string,
    { ownerName: string; ownerId: string | null; rows: ActionListRow[] }
  >();

  for (const row of rows) {
    const key = row.ownerId ?? "unassigned";
    const group = groups.get(key) ?? {
      ownerName: row.ownerName,
      ownerId: row.ownerId,
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.rows.sort((a, b) => {
      const at = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER;
      const bt = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
  }

  // Owners with overdue work first; unassigned always last, because an
  // unassigned action is a different problem from a late one.
  return [...groups.values()].sort((a, b) => {
    if (!a.ownerId) return 1;
    if (!b.ownerId) return -1;
    const aOverdue = a.rows.filter((r) => r.state === "overdue").length;
    const bOverdue = b.rows.filter((r) => r.state === "overdue").length;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;
    return a.ownerName.localeCompare(b.ownerName);
  });
}
