// ==================================================================
// The risk engine — single source of truth for scoring and banding.
//
//   Risk score = Likelihood (1-5) × Severity (1-5) → 1..25
//
// Banded into five levels. The source module (Centrely `riskly`) used
// four; the five-band map below preserves its escalation threshold
// exactly — "needs action" still begins at score 10.
//
// Dependency-free on purpose: imported by server actions, client
// components and the seed script alike.
// ==================================================================

export type RiskBand = 1 | 2 | 3 | 4 | 5;

export const RISK_BANDS: readonly RiskBand[] = [1, 2, 3, 4, 5];

/** Likelihood 1..5 (index 0 = rating 1). */
export const LIKELIHOOD_LABELS = [
  "Improbable",
  "Possible",
  "Very possible",
  "Probable",
  "Almost certain",
] as const;

/** Consequence severity 1..5. */
export const SEVERITY_LABELS = [
  "Insignificant",
  "Minor",
  "Moderate",
  "Major",
  "Fatal",
] as const;

/** The full descriptors, shown against the matrix axes when authoring. */
export const SEVERITY_DESCRIPTIONS = [
  "Minor first aid, no time off, no loss",
  "Lost time, recoverable — strain, sprain, laceration, dermatitis",
  "Temporary disability, recoverable — minor fracture, asthma, concussion",
  "Permanent disability, survivable — major fracture, amputation, poisoning",
  "Causing death to one or more people",
] as const;

export const LIKELIHOOD_DESCRIPTIONS = [
  "Not expected to happen in the life of the centre",
  "Could happen but would be unusual",
  "Could happen from time to time",
  "Expected to happen at some point",
  "Expected to happen regularly",
] as const;

export function clampRating(n: number): 1 | 2 | 3 | 4 | 5 {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}

// clampRating narrows to 1..5, so the index is provably 0..4 on a 5-tuple.
export function likelihoodLabel(n: number): string {
  return LIKELIHOOD_LABELS[clampRating(n) - 1]!;
}

export function severityLabel(n: number): string {
  return SEVERITY_LABELS[clampRating(n) - 1]!;
}

export function riskScore(likelihood: number, severity: number): number {
  return clampRating(likelihood) * clampRating(severity);
}

/**
 * Score → band. Thresholds chosen so the 25 cells fall 8/7/4/3/3 — fewer
 * cells as severity climbs, which is the right shape for safety.
 */
export function riskBand(score: number): RiskBand {
  if (score <= 4) return 1;
  if (score <= 9) return 2;
  if (score <= 12) return 3;
  if (score <= 16) return 4;
  return 5;
}

export function bandFromRatings(likelihood: number, severity: number): RiskBand {
  return riskBand(riskScore(likelihood, severity));
}

export interface BandMeta {
  band: RiskBand;
  /** The word an inspector reads. Colour is never the only carrier. */
  label: string;
  /**
   * The banding rule, not the scores that happen to occur. Only products of
   * two 1–5 ratings are reachable (so no finding is ever 13, 14 or 19), but
   * the printed key has to survive an inspector checking the arithmetic.
   */
  range: string;
  /** Tile fill + the text colour that belongs to it. */
  fill: string;
  /** Band colour as text on a light surface. */
  ink: string;
  /** Soft chip: wash background, band ink, band hairline. */
  chip: string;
  /** Hairline / bar fill for charts. */
  bar: string;
}

export const BAND_META: Record<RiskBand, BandMeta> = {
  1: {
    band: 1,
    label: "Very low",
    range: "1–4",
    fill: "bg-risk-1 text-risk-1-on",
    ink: "text-risk-1-ink",
    chip: "bg-risk-1-wash text-risk-1-ink ring-1 ring-risk-1",
    bar: "var(--color-risk-1)",
  },
  2: {
    band: 2,
    label: "Low",
    range: "5–9",
    fill: "bg-risk-2 text-risk-2-on",
    ink: "text-risk-2-ink",
    chip: "bg-risk-2-wash text-risk-2-ink ring-1 ring-risk-2",
    bar: "var(--color-risk-2)",
  },
  3: {
    band: 3,
    label: "Moderate",
    range: "10–12",
    fill: "bg-risk-3 text-risk-3-on",
    ink: "text-risk-3-ink",
    chip: "bg-risk-3-wash text-risk-3-ink ring-1 ring-risk-3",
    bar: "var(--color-risk-3)",
  },
  4: {
    band: 4,
    label: "High",
    range: "13–16",
    fill: "bg-risk-4 text-risk-4-on",
    ink: "text-risk-4-ink",
    chip: "bg-risk-4-wash text-risk-4-ink ring-1 ring-risk-4",
    bar: "var(--color-risk-4)",
  },
  5: {
    band: 5,
    label: "Very high",
    range: "17–25",
    fill: "bg-risk-5 text-risk-5-on",
    ink: "text-risk-5-ink",
    chip: "bg-risk-5-wash text-risk-5-ink ring-1 ring-risk-5",
    bar: "var(--color-risk-5)",
  },
};

/**
 * Band metadata for a raw 1–25 score.
 *
 * Takes a score and only a score. An earlier version accepted "a score or a
 * band" and guessed between them, which silently mislabelled every score of
 * 1–5 — a residual of 5 came out as band 5, "Very high", instead of band 2,
 * "Low". Where a band is already in hand, index `BAND_META` directly.
 */
export function bandMeta(score: number): BandMeta {
  return BAND_META[riskBand(score)];
}

/**
 * Needs action. Preserves the source module's threshold: score 10 and above.
 * A residual score at or above this is what the Actions screen exists for.
 */
export const ACTION_THRESHOLD = 10;

export function needsAction(score: number): boolean {
  return score >= ACTION_THRESHOLD;
}

/** "High risk" in the reporting sense — band 4 or 5. */
export function isHighRisk(score: number): boolean {
  return riskBand(score) >= 4;
}

export interface MatrixCell {
  likelihood: number;
  severity: number;
  score: number;
  band: RiskBand;
}

/**
 * The 5×5 grid, laid out for rendering: rows run likelihood 5 (top) → 1
 * (bottom), columns run severity 1 → 5. Likelihood ascends upward because
 * that is how every printed risk matrix in the sector is drawn.
 */
export function buildMatrix(): MatrixCell[][] {
  const rows: MatrixCell[][] = [];
  for (let l = 5; l >= 1; l--) {
    const row: MatrixCell[] = [];
    for (let s = 1; s <= 5; s++) {
      const score = l * s;
      row.push({ likelihood: l, severity: s, score, band: riskBand(score) });
    }
    rows.push(row);
  }
  return rows;
}

/** A full spoken description of one cell, for screen readers and tooltips. */
export function describeCell(likelihood: number, severity: number): string {
  const score = riskScore(likelihood, severity);
  const meta = bandMeta(score);
  return `Likelihood ${likelihood} ${likelihoodLabel(likelihood).toLowerCase()}, severity ${severity} ${severityLabel(
    severity,
  ).toLowerCase()}. Risk ${score}, ${meta.label.toLowerCase()}.`;
}

// ------------------------------------------------------------------
// Initial → residual. The delta is the most persuasive number in any
// report, so it gets a first-class type rather than being recomputed
// at each call site.
// ------------------------------------------------------------------

export interface StageRisk {
  likelihood: number;
  severity: number;
  score: number;
  band: RiskBand;
}

export function assessStage(likelihood: number, severity: number): StageRisk {
  const l = clampRating(likelihood);
  const s = clampRating(severity);
  const score = l * s;
  return { likelihood: l, severity: s, score, band: riskBand(score) };
}

/** Percentage cut from initial → residual, 0..100. */
export function riskReductionPct(initialScore: number, residualScore: number): number {
  if (initialScore <= 0) return 0;
  const pct = ((initialScore - residualScore) / initialScore) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export interface FindingRatings {
  likelihood: number;
  severity: number;
  residual_likelihood: number;
  residual_severity: number;
}

export interface RiskProfile {
  initial: StageRisk;
  residual: StageRisk;
  reductionPct: number;
}

export function findingRiskProfile(f: FindingRatings): RiskProfile {
  const initial = assessStage(f.likelihood, f.severity);
  const residual = assessStage(f.residual_likelihood, f.residual_severity);
  return {
    initial,
    residual,
    reductionPct: riskReductionPct(initial.score, residual.score),
  };
}

/**
 * An assessment's headline residual score — the highest residual among its
 * findings, not the mean. A register row must surface the worst thing in the
 * document; averaging hides a 25 behind a page of 2s.
 */
export function headlineResidualScore(
  findings: Pick<FindingRatings, "residual_likelihood" | "residual_severity">[],
): number {
  let worst = 0;
  for (const f of findings) {
    const score = riskScore(f.residual_likelihood, f.residual_severity);
    if (score > worst) worst = score;
  }
  return worst;
}

export function headlineInitialScore(
  findings: Pick<FindingRatings, "likelihood" | "severity">[],
): number {
  let worst = 0;
  for (const f of findings) {
    const score = riskScore(f.likelihood, f.severity);
    if (score > worst) worst = score;
  }
  return worst;
}
