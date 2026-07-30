// ==================================================================
// One schema per entity, imported by both the client form and the server
// action. There is no second copy of these rules anywhere.
//
// Error messages say what went wrong and how to fix it. They never
// apologise and never go vague.
// ==================================================================

import { z } from "zod";
import { ASSESSMENT_STATUSES, HAZARD_CATEGORIES, PERSONS_AT_RISK } from "@/lib/vocab";

const uuid = z.string().uuid("That record could not be found.");

const rating = z.coerce
  .number()
  .int()
  .min(1, "Pick a value between 1 and 5.")
  .max(5, "Pick a value between 1 and 5.");

const optionalText = (max: number, field: string) =>
  z
    .string()
    .trim()
    .max(max, `Keep ${field} under ${max} characters.`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

// ---- assessment ---------------------------------------------------

export const assessmentSchema = z.object({
  centreId: uuid.describe("centre"),
  templateId: uuid.optional(),
  title: z
    .string()
    .trim()
    .min(3, "Give the assessment a title so it can be found in the register.")
    .max(160, "Keep the title under 160 characters."),
  scopeNote: optionalText(2000, "the scope note"),
  reviewFrequencyMonths: z.coerce
    .number()
    .int()
    .min(1, "Reviews happen at least once every 60 months.")
    .max(60, "Reviews happen at least once every 60 months."),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const assessmentStatusSchema = z.object({
  id: uuid,
  status: z.enum(ASSESSMENT_STATUSES),
});

// ---- finding ------------------------------------------------------

export const findingSchema = z
  .object({
    id: uuid.optional(),
    assessmentId: uuid,
    hazardId: uuid.describe("hazard"),
    likelihood: rating,
    severity: rating,
    controlMeasureIds: z
      .array(uuid)
      .default([])
      .refine((v) => new Set(v).size === v.length, "That control is already selected."),
    residualLikelihood: rating,
    residualSeverity: rating,
    personsAtRisk: z.array(z.enum(PERSONS_AT_RISK)).default([]),
    notes: optionalText(2000, "the notes"),
    photoIds: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (f) => f.residualLikelihood * f.residualSeverity <= f.likelihood * f.severity,
    {
      // The database refuses this too. Catching it here means the assessor
      // gets a sentence rather than a constraint violation.
      message:
        "Residual risk cannot be higher than the initial risk — controls only ever reduce it. Check the two matrix selections.",
      path: ["residualLikelihood"],
    },
  )
  .refine((f) => f.controlMeasureIds.length > 0 || f.residualLikelihood * f.residualSeverity === f.likelihood * f.severity, {
    message:
      "Residual risk is lower than the initial risk, so select the controls that bring it down.",
    path: ["controlMeasureIds"],
  });

export type FindingInput = z.infer<typeof findingSchema>;

// ---- action -------------------------------------------------------

export const actionSchema = z.object({
  id: uuid.optional(),
  findingId: uuid,
  description: z
    .string()
    .trim()
    .min(5, "Describe what needs doing, so whoever picks this up knows the task.")
    .max(500, "Keep the description under 500 characters."),
  ownerId: uuid.optional(),
  dueAt: z
    .string()
    .trim()
    .min(1, "Set a due date — an action without one never gets done.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Use a real date."),
});

export type ActionInput = z.infer<typeof actionSchema>;

export const closeActionSchema = z.object({
  id: uuid,
  closureNote: optionalText(500, "the closure note"),
});

// ---- library additions --------------------------------------------
// Deliberately slightly effortful: guidance is required on a proposed
// hazard, because an entry with no guidance is what makes a library rot.

export const hazardProposalSchema = z.object({
  label: z
    .string()
    .trim()
    .min(6, "Name the hazard in full — short labels become ambiguous across centres.")
    .max(160, "Keep the label under 160 characters."),
  category: z.enum(HAZARD_CATEGORIES),
  guidance: z
    .string()
    .trim()
    .min(20, "Add a line of guidance so another assessor knows when this applies.")
    .max(1000, "Keep the guidance under 1000 characters."),
});

export type HazardProposalInput = z.infer<typeof hazardProposalSchema>;

export const controlProposalSchema = z.object({
  label: z
    .string()
    .trim()
    .min(6, "Name the control in full.")
    .max(160, "Keep the label under 160 characters."),
  category: z.enum(HAZARD_CATEGORIES),
});

export type ControlProposalInput = z.infer<typeof controlProposalSchema>;

// ---- sign-off -----------------------------------------------------
// Sign-off is a deliberate final step, so it carries an explicit
// affirmation rather than being a plain button press.

export const signOffSchema = z.object({
  id: uuid,
  confirmed: z.literal(true, {
    message: "Confirm the statement to sign off this assessment.",
  }),
});

// ---- revision -----------------------------------------------------

export const revisionSchema = z.object({
  assessmentId: uuid,
  reason: z
    .string()
    .trim()
    .min(10, "Say what is being corrected — this is the audit trail.")
    .max(500, "Keep the reason under 500 characters."),
});

export type RevisionInput = z.infer<typeof revisionSchema>;

// ---- auth ---------------------------------------------------------

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Passwords are at least 8 characters."),
});

export type SignInInput = z.infer<typeof signInSchema>;
