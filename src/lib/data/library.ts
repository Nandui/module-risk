import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ControlMeasureRow, HazardRow, TemplateRow } from "@/lib/db/types";

/**
 * The controlled libraries. Read on nearly every screen, so each is cached
 * per request and fetched whole — a few hundred rows is smaller than the
 * round trips it would take to page them.
 */

export const listHazards = cache(async (): Promise<HazardRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hazard")
    .select("*")
    .neq("review_state", "rejected")
    .order("label");
  return data ?? [];
});

export const listControlMeasures = cache(async (): Promise<ControlMeasureRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("control_measure")
    .select("*")
    .neq("review_state", "rejected")
    .order("label");
  return data ?? [];
});

export const listTemplates = cache(async (): Promise<TemplateRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("template").select("*").order("name");
  return data ?? [];
});

/** Entries proposed mid-walk, waiting on the H&S lead. */
export const listPendingLibraryEntries = cache(async () => {
  const supabase = await createClient();
  const [{ data: hazards }, { data: controls }] = await Promise.all([
    supabase
      .from("hazard")
      .select("*")
      .eq("review_state", "pending_review")
      .order("created_at"),
    supabase
      .from("control_measure")
      .select("*")
      .eq("review_state", "pending_review")
      .order("created_at"),
  ]);
  return { hazards: hazards ?? [], controls: controls ?? [] };
});

export async function lookupMaps() {
  const [hazards, controls] = await Promise.all([listHazards(), listControlMeasures()]);
  return {
    hazardById: new Map(hazards.map((h) => [h.id, h])),
    controlById: new Map(controls.map((c) => [c.id, c])),
    hazards,
    controls,
  };
}
