import { cache } from "react";
import type { ControlMeasure, Hazard, Template } from "@prisma/client";
import { query } from "@/lib/data/session";

/**
 * The controlled libraries. Read on nearly every screen, so each is cached
 * per request and fetched whole — a few hundred rows is smaller than the
 * round trips it would take to page them.
 */

export const listHazards = cache(
  (): Promise<Hazard[]> =>
    query((tx) =>
      tx.hazard.findMany({
        where: { reviewState: { not: "rejected" } },
        orderBy: { label: "asc" },
      }),
    ),
);

export const listControlMeasures = cache(
  (): Promise<ControlMeasure[]> =>
    query((tx) =>
      tx.controlMeasure.findMany({
        where: { reviewState: { not: "rejected" } },
        orderBy: { label: "asc" },
      }),
    ),
);

export const listTemplates = cache(
  (): Promise<Template[]> =>
    query((tx) => tx.template.findMany({ orderBy: { name: "asc" } })),
);

/** Entries proposed mid-walk, waiting on the H&S lead. */
export const listPendingLibraryEntries = cache(() =>
  query(async (tx) => {
    const [hazards, controls] = await Promise.all([
      tx.hazard.findMany({
        where: { reviewState: "pending_review" },
        orderBy: { createdAt: "asc" },
      }),
      tx.controlMeasure.findMany({
        where: { reviewState: "pending_review" },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return { hazards, controls };
  }),
);

export async function lookupMaps() {
  const [hazards, controls] = await Promise.all([listHazards(), listControlMeasures()]);
  return {
    hazardById: new Map(hazards.map((h) => [h.id, h])),
    controlById: new Map(controls.map((c) => [c.id, c])),
    hazards,
    controls,
  };
}
