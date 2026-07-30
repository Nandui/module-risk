// ==================================================================
// Controlled vocabulary. Non-negotiable: free-text hazard fields make
// cross-centre reporting impossible, and cross-centre comparison is the
// entire value of this product to a group.
//
// Carried over from the Centrely `riskly` module, which had already
// settled these categories against a real leisure-centre operation.
// ==================================================================

/** Who a finding puts at risk. Multi-select from this list only. */
export const PERSONS_AT_RISK = [
  "Staff",
  "Customers",
  "Children",
  "Contractors",
  "Visitors",
] as const;

export type PersonAtRisk = (typeof PERSONS_AT_RISK)[number];

/** Hazard and control-measure category. */
export const HAZARD_CATEGORIES = [
  "Physical",
  "Chemical",
  "Biological",
  "Ergonomic",
  "Psychosocial",
  "Environmental",
] as const;

export type HazardCategory = (typeof HAZARD_CATEGORIES)[number];

/**
 * Category display metadata. Deliberately cool and low-chroma — these sit
 * in the same rows as risk tiles and must never compete with them. No
 * category borrows a hue from the risk ramp.
 */
export const CATEGORY_META: Record<HazardCategory, { label: string; chip: string }> = {
  Physical: { label: "Physical", chip: "bg-surface-sunk text-ink-soft ring-1 ring-rule" },
  Chemical: { label: "Chemical", chip: "bg-accent-wash text-accent-ink ring-1 ring-accent-line" },
  Biological: { label: "Biological", chip: "bg-surface-sunk text-ink-soft ring-1 ring-rule-strong" },
  Ergonomic: { label: "Ergonomic", chip: "bg-surface-sunk text-muted ring-1 ring-rule" },
  Psychosocial: { label: "Psychosocial", chip: "bg-accent-wash text-accent-ink ring-1 ring-rule" },
  Environmental: { label: "Environmental", chip: "bg-surface-sunk text-accent-ink ring-1 ring-accent-line" },
};

/** Assessment lifecycle. Signed off is terminal for the record itself. */
export const ASSESSMENT_STATUSES = ["draft", "in_review", "signed_off", "archived"] as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

/**
 * Status metadata. Risk owns colour; status owns shape and weight. This is
 * what keeps the register from becoming a rainbow — see DESIGN.md.
 */
export const STATUS_META: Record<
  AssessmentStatus,
  { label: string; chip: string; description: string }
> = {
  draft: {
    label: "Draft",
    chip: "border border-dashed border-rule-strong text-muted",
    description: "Being worked on. Not yet evidence.",
  },
  in_review: {
    label: "In review",
    chip: "border border-accent-line bg-accent-wash text-accent-ink",
    description: "Waiting on the H&S lead.",
  },
  signed_off: {
    label: "Signed off",
    chip: "bg-ink text-surface-raised",
    description: "In force. The record can no longer be edited.",
  },
  archived: {
    label: "Archived",
    chip: "border border-rule text-muted",
    description: "Superseded or no longer in use.",
  },
};

/** Review cadence, in months. */
export const REVIEW_FREQUENCIES = [
  { value: 1, label: "Monthly" },
  { value: 3, label: "Every 3 months" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Annually" },
  { value: 24, label: "Every 2 years" },
  { value: 36, label: "Every 3 years" },
] as const;

/** A review due inside this window is "due soon" rather than merely upcoming. */
export const DUE_SOON_DAYS = 30;

/** Group-level roles. Single organisation — no per-org provisioning. */
export const USER_ROLES = ["assessor", "manager", "hs_lead"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_META: Record<UserRole, { label: string; description: string }> = {
  assessor: {
    label: "Assessor",
    description: "Completes assessments on site. Duty managers sit here.",
  },
  manager: {
    label: "Centre manager",
    description: "Owns the register for their centres and signs off assessments.",
  },
  hs_lead: {
    label: "H&S lead",
    description: "Group-wide view, approves library additions, reports to insurers.",
  },
};

/** Action status is derived from dates, never stored — one less thing to drift. */
export type ActionState = "open" | "due_soon" | "overdue" | "closed";

export const ACTION_STATE_META: Record<ActionState, { label: string; chip: string }> = {
  open: { label: "Open", chip: "border border-rule-strong text-ink-soft" },
  due_soon: { label: "Due soon", chip: "border border-accent-line bg-accent-wash text-accent-ink" },
  overdue: { label: "Overdue", chip: "bg-risk-5-wash text-risk-5-ink ring-1 ring-risk-5" },
  closed: { label: "Closed", chip: "border border-rule text-muted" },
};
