/**
 * Invariant checks on the risk engine.
 *
 *   node --experimental-strip-types scripts/verify-risk.ts
 *
 * The engine is the one piece of logic every screen, the register sort, the
 * report and the PDF all depend on. It shipped once with `bandMeta` guessing
 * whether its argument was a score or a band, which mislabelled every
 * residual of 1–5 as "Very high". Nothing about that was visible in a type
 * signature, so it is checked here instead.
 */
import {
  ACTION_THRESHOLD,
  BAND_META,
  RISK_BANDS,
  bandFromRatings,
  bandMeta,
  buildMatrix,
  clampRating,
  describeCell,
  headlineInitialScore,
  headlineResidualScore,
  isHighRisk,
  needsAction,
  riskBand,
  riskReductionPct,
  riskScore,
  severityLabel,
  likelihoodLabel,
  type RiskBand,
} from "../src/lib/risk.ts";

let failures = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("scoring");
check(
  "score is likelihood × severity across all 25 cells",
  [1, 2, 3, 4, 5].every((l) => [1, 2, 3, 4, 5].every((s) => riskScore(l, s) === l * s)),
);
check("ratings clamp into 1..5", clampRating(0) === 1 && clampRating(9) === 5 && clampRating(3) === 3);
check("a non-finite rating falls back to 1", clampRating(Number.NaN) === 1);

console.log("\nbanding");
const bandOf: Record<RiskBand, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
for (let score = 1; score <= 25; score++) bandOf[riskBand(score)].push(score);

check(
  "band 1 covers 1–4",
  JSON.stringify(bandOf[1]) === JSON.stringify([1, 2, 3, 4]),
  bandOf[1].join(","),
);
check(
  "band 2 covers 5–9",
  JSON.stringify(bandOf[2]) === JSON.stringify([5, 6, 7, 8, 9]),
  bandOf[2].join(","),
);
check(
  "band 3 covers 10–12",
  JSON.stringify(bandOf[3]) === JSON.stringify([10, 11, 12]),
  bandOf[3].join(","),
);
check(
  "band 4 covers 13–16",
  JSON.stringify(bandOf[4]) === JSON.stringify([13, 14, 15, 16]),
  bandOf[4].join(","),
);
check("band 5 covers 17–25", bandOf[5][0] === 17 && bandOf[5].at(-1) === 25);
check("banding is monotonic in score", (() => {
  let last = 0;
  for (let s = 1; s <= 25; s++) {
    const b = riskBand(s);
    if (b < last) return false;
    last = b;
  }
  return true;
})());

// The distribution the band thresholds were chosen for: fewer cells as
// severity climbs, which is the right shape for safety.
const cellsPerBand: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const row of buildMatrix()) for (const cell of row) cellsPerBand[cell.band] = (cellsPerBand[cell.band] ?? 0) + 1;
check(
  "the 25 cells fall 8/7/4/3/3 across the bands",
  JSON.stringify(cellsPerBand) === JSON.stringify({ 1: 8, 2: 7, 3: 4, 4: 3, 5: 3 }),
  JSON.stringify(cellsPerBand),
);

console.log("\nbandMeta takes a score, never a band");
// The regression. Every one of these scores is also a valid band number, and
// the old implementation returned the band with that number instead.
for (const score of [1, 2, 3, 4, 5]) {
  check(
    `score ${score} → band ${riskBand(score)} (${BAND_META[riskBand(score)].label})`,
    bandMeta(score).band === riskBand(score),
    `got band ${bandMeta(score).band}`,
  );
}
check(
  "bandMeta agrees with riskBand for every score 1–25",
  Array.from({ length: 25 }, (_, i) => i + 1).every(
    (s) => bandMeta(s).band === riskBand(s),
  ),
);
check(
  "every band's stated range contains exactly its own scores",
  RISK_BANDS.every((band) => {
    const [lo, hi] = BAND_META[band].range.split("–").map(Number);
    return bandOf[band].every((s) => s >= lo! && s <= hi!);
  }),
);

console.log("\nescalation");
check("the action threshold is 10", ACTION_THRESHOLD === 10);
check("score 9 needs no action", !needsAction(9));
check("score 10 needs an action", needsAction(10));
check("high risk starts at band 4", !isHighRisk(12) && isHighRisk(15) && isHighRisk(25));

console.log("\nmatrix layout");
const matrix = buildMatrix();
check("the grid is 5 rows of 5", matrix.length === 5 && matrix.every((r) => r.length === 5));
check("likelihood ascends up the grid", matrix[0]![0]!.likelihood === 5 && matrix[4]![0]!.likelihood === 1);
check("severity ascends across the grid", matrix[0]![0]!.severity === 1 && matrix[0]![4]!.severity === 5);
check("the top-right cell is 25", matrix[0]![4]!.score === 25);
check("the bottom-left cell is 1", matrix[4]![0]!.score === 1);
check("bandFromRatings matches riskBand of the product", bandFromRatings(4, 4) === riskBand(16));

console.log("\nreduction and headlines");
check("reduction of 16 → 4 is 75%", riskReductionPct(16, 4) === 75);
check("no reduction reads 0%", riskReductionPct(9, 9) === 0);
check("a zero initial score cannot divide", riskReductionPct(0, 0) === 0);
check("reduction is clamped to 0..100", riskReductionPct(4, 16) === 0);

const findings = [
  { likelihood: 2, severity: 2, residual_likelihood: 1, residual_severity: 1 },
  { likelihood: 5, severity: 5, residual_likelihood: 2, residual_severity: 5 },
  { likelihood: 3, severity: 2, residual_likelihood: 2, residual_severity: 2 },
];
check("the headline initial is the worst, not the mean", headlineInitialScore(findings) === 25);
check("the headline residual is the worst, not the mean", headlineResidualScore(findings) === 10);
check("no findings gives a headline of 0", headlineResidualScore([]) === 0);

console.log("\nspoken labels — risk is never colour alone");
check("every cell has a spoken description naming the band", (() => {
  for (const row of matrix) {
    for (const cell of row) {
      const text = describeCell(cell.likelihood, cell.severity);
      if (!text.includes(BAND_META[cell.band].label.toLowerCase())) return false;
      if (!text.includes(String(cell.score))) return false;
    }
  }
  return true;
})());
check(
  "rating labels exist for 1..5 on both axes",
  [1, 2, 3, 4, 5].every((n) => Boolean(likelihoodLabel(n)) && Boolean(severityLabel(n))),
);
check(
  "every band ships a fill, an ink, a chip and a label",
  RISK_BANDS.every((b) => {
    const m = BAND_META[b];
    return Boolean(m.fill && m.ink && m.chip && m.label && m.range);
  }),
);
// Bands 1–4 take ink numerals, band 5 takes white: the ISO 7010 crossover.
check(
  "the fill class always pairs a background with its own text colour",
  RISK_BANDS.every((b) => BAND_META[b].fill.includes(`bg-risk-${b}`) && BAND_META[b].fill.includes(`text-risk-${b}-on`)),
);

console.log(
  failures === 0 ? "\nAll risk-engine checks passed." : `\nFAILED — ${failures} check(s)`,
);
process.exit(failures > 0 ? 1 : 0);
