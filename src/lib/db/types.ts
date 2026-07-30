// ==================================================================
// Database types.
//
// Hand-written rather than generated so the shape stays reviewable in a
// diff. Regenerate-and-replace is available if you prefer:
//   supabase gen types typescript --local > src/lib/db/types.ts
// ==================================================================

import type {
  AssessmentStatus,
  HazardCategory,
  PersonAtRisk,
  UserRole,
} from "@/lib/vocab";

export type LibraryReviewState = "approved" | "pending_review" | "rejected";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export type CentreRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  created_at: string;
}

export type HazardRow = {
  id: string;
  label: string;
  category: HazardCategory;
  guidance: string | null;
  review_state: LibraryReviewState;
  created_by: string | null;
  created_at: string;
}

export type ControlMeasureRow = {
  id: string;
  label: string;
  category: HazardCategory;
  review_state: LibraryReviewState;
  created_by: string | null;
  created_at: string;
}

export type TemplateRow = {
  id: string;
  name: string;
  category: HazardCategory;
  hazard_ids: string[];
  created_at: string;
}

export type AssessmentRow = {
  id: string;
  reference: string;
  centre_id: string;
  template_id: string | null;
  title: string;
  status: AssessmentStatus;
  assessor_id: string | null;
  reviewed_by: string | null;
  review_frequency_months: number;
  review_due_at: string | null;
  signed_off_at: string | null;
  signed_off_by: string | null;
  scope_note: string | null;
  created_at: string;
  updated_at: string;
}

export type FindingRow = {
  id: string;
  assessment_id: string;
  hazard_id: string;
  sort_order: number;
  likelihood: number;
  severity: number;
  control_measure_ids: string[];
  residual_likelihood: number;
  residual_severity: number;
  persons_at_risk: PersonAtRisk[];
  notes: string | null;
  photo_ids: string[];
  created_at: string;
  updated_at: string;
}

export type ActionRow = {
  id: string;
  finding_id: string;
  centre_id: string;
  description: string;
  owner_id: string | null;
  due_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_note: string | null;
  created_at: string;
}

export type RevisionRow = {
  id: string;
  assessment_id: string;
  centre_id: string;
  revision_no: number;
  snapshot: unknown;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Insert and Update are permissive by design: the columns that must be
 * present are enforced by NOT NULL and by the triggers in the migrations,
 * which is the only place that can be authoritative. Mirroring them here
 * would be a second copy that drifts.
 */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profile: Table<ProfileRow>;
      centre: Table<CentreRow>;
      centre_member: Table<{ centre_id: string; profile_id: string }>;
      hazard: Table<HazardRow>;
      control_measure: Table<ControlMeasureRow>;
      template: Table<TemplateRow>;
      assessment: Table<AssessmentRow>;
      finding: Table<FindingRow>;
      action: Table<ActionRow>;
      revision: Table<RevisionRow>;
    };
    // `Record<string, never>` rather than `{}` — postgrest-js expects an
    // index signature here, and an empty object type does not satisfy one.
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      hazard_category: HazardCategory;
      person_at_risk: PersonAtRisk;
      assessment_status: AssessmentStatus;
      user_role: UserRole;
      library_review_state: LibraryReviewState;
    };
    CompositeTypes: Record<string, never>;
  };
}
