import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { riskScore, riskBand, type RiskBand } from "@/lib/risk";
import { actionState } from "@/lib/utils";
import type { ActionState } from "@/lib/vocab";
import { lookupMaps } from "@/lib/data/library";

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
  async (centreId: string | null, includeClosed = false): Promise<ActionListRow[]> => {
    const supabase = await createClient();

    let query = supabase.from("action").select("*");
    if (centreId) query = query.eq("centre_id", centreId);
    if (!includeClosed) query = query.is("closed_at", null);

    const { data: actions } = await query.order("due_at", { nullsFirst: false });
    if (!actions || actions.length === 0) return [];

    const findingIds = [...new Set(actions.map((a) => a.finding_id))];

    const [{ data: findings }, { data: profiles }, { data: centres }, maps] =
      await Promise.all([
        supabase
          .from("finding")
          .select(
            "id, assessment_id, hazard_id, residual_likelihood, residual_severity",
          )
          .in("id", findingIds),
        supabase.from("profile").select("id, full_name"),
        supabase.from("centre").select("id, name, code"),
        lookupMaps(),
      ]);

    const assessmentIds = [...new Set((findings ?? []).map((f) => f.assessment_id))];
    const { data: assessments } = assessmentIds.length
      ? await supabase
          .from("assessment")
          .select("id, reference, title")
          .in("id", assessmentIds)
      : { data: [] };

    const findingById = new Map((findings ?? []).map((f) => [f.id, f]));
    const assessmentById = new Map((assessments ?? []).map((a) => [a.id, a]));
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const centreById = new Map((centres ?? []).map((c) => [c.id, c]));

    return actions.flatMap((action) => {
      const finding = findingById.get(action.finding_id);
      if (!finding) return [];
      const assessment = assessmentById.get(finding.assessment_id);
      const centre = centreById.get(action.centre_id);
      const residualScore = riskScore(
        finding.residual_likelihood,
        finding.residual_severity,
      );

      return [
        {
          id: action.id,
          description: action.description,
          dueAt: action.due_at,
          closedAt: action.closed_at,
          state: actionState(action),
          ownerId: action.owner_id,
          ownerName: action.owner_id
            ? (nameById.get(action.owner_id) ?? "Unassigned")
            : "Unassigned",
          centreId: action.centre_id,
          centreName: centre?.name ?? "Unknown centre",
          centreCode: centre?.code ?? "??",
          assessmentId: finding.assessment_id,
          assessmentRef: assessment?.reference ?? "—",
          assessmentTitle: assessment?.title ?? "—",
          hazardLabel: maps.hazardById.get(finding.hazard_id)?.label ?? "Unknown hazard",
          residualScore,
          band: riskBand(residualScore),
        } satisfies ActionListRow,
      ];
    });
  },
);

/**
 * Grouped by owner, each group ordered by due date. Overdue first inside a
 * group, because that is the order the work gets picked up in.
 */
export function groupByOwner(rows: ActionListRow[]) {
  const groups = new Map<string, { ownerName: string; ownerId: string | null; rows: ActionListRow[] }>();

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
