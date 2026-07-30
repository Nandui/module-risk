import { notFound } from "next/navigation";
import { MatrixPlayground } from "@/components/risk/matrix-playground";
import { BandKey, BandBadge, RiskDelta, TileChip } from "@/components/risk/tile-chip";
import { TileMatrixHeat, TileMatrixStatic } from "@/components/risk/tile-matrix";
import { BAND_META, LIKELIHOOD_LABELS, RISK_BANDS, SEVERITY_LABELS } from "@/lib/risk";
import { CATEGORY_META, HAZARD_CATEGORIES, STATUS_META, ASSESSMENT_STATUSES } from "@/lib/vocab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The design system, in isolation.
 *
 * Step 3 of the build order — "the risk matrix component in isolation, until
 * it's genuinely good" — plus the tokens and type scale around it, so a
 * change to the ramp can be judged without hunting through the app.
 *
 * Not available in production: it needs no data and no session, which is
 * exactly why it must not be routable on a deployed instance.
 */
export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-rule bg-surface-raised px-6 py-5">
        <p className="eyebrow">Design system</p>
        <h1 className="mt-1.5 font-display text-title font-bold text-ink">
          Tokens, type and the tile matrix
        </h1>
        <p className="mt-1 max-w-prose text-ui text-muted">
          Development reference. The matrix is the signature element; everything
          around it stays quiet.
        </p>
      </header>

      <div className="space-y-14 px-6 py-10">
        {/* ---- the matrix ---------------------------------------- */}
        <Section
          title="Risk matrix"
          note="Square corners, 2px grout gaps, stencilled numerals. Tap a cell — arrow keys walk the grid, Enter commits."
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
            <MatrixPlayground />

            <div className="space-y-6">
              <div>
                <p className="eyebrow mb-2">Static, marking one position</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { likelihood: 1, severity: 2 },
                    { likelihood: 3, severity: 3 },
                    { likelihood: 4, severity: 4 },
                    { likelihood: 5, severity: 5 },
                  ].map((v) => (
                    <TileMatrixStatic key={`${v.likelihood}-${v.severity}`} value={v} />
                  ))}
                </div>
              </div>

              <div>
                <p className="eyebrow mb-2">Heat map — where findings cluster</p>
                <div className="max-w-56">
                  <TileMatrixHeat
                    counts={{
                      "2-2": 4,
                      "2-3": 7,
                      "3-3": 3,
                      "1-5": 2,
                      "2-5": 1,
                      "4-2": 5,
                      "3-4": 2,
                      "5-1": 1,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ---- chips --------------------------------------------- */}
        <Section
          title="Tile chips"
          note="The matrix carried into the register. Colour plus numeral, always — never colour alone."
        >
          <div className="space-y-5">
            <div>
              <p className="eyebrow mb-2">One position, with and without coordinates</p>
              <div className="flex flex-wrap items-center gap-5">
                <TileChip likelihood={2} severity={2} />
                <TileChip likelihood={3} severity={4} showPosition />
                <TileChip likelihood={5} severity={5} showPosition />
                <TileChip likelihood={4} severity={4} size="sm" />
              </div>
            </div>

            <div>
              <p className="eyebrow mb-2">Initial → residual, the persuasive number</p>
              <div className="space-y-2">
                <RiskDelta likelihood={4} severity={4} residualLikelihood={2} residualSeverity={3} />
                <RiskDelta likelihood={5} severity={5} residualLikelihood={2} residualSeverity={5} />
                <RiskDelta likelihood={3} severity={2} residualLikelihood={3} residualSeverity={2} />
              </div>
            </div>

            <div>
              <p className="eyebrow mb-2">Band badges and the key</p>
              <div className="flex flex-wrap items-center gap-2">
                {RISK_BANDS.map((band) => (
                  <BandBadge key={band} band={band} />
                ))}
              </div>
              <div className="mt-3">
                <BandKey />
              </div>
            </div>
          </div>
        </Section>

        {/* ---- the ramp ------------------------------------------ */}
        <Section
          title="Risk ramp"
          note="Lightness descends in even 0.06 OKLCH steps and chroma ascends, so the ramp survives a greyscale printout. Bands 1–4 take ink numerals, band 5 takes white — the ISO 7010 crossover."
        >
          <div className="grid gap-px overflow-hidden border border-rule sm:grid-cols-5">
            {RISK_BANDS.map((band) => {
              const meta = BAND_META[band];
              return (
                <div key={band}>
                  <div className={cn("grid h-24 place-items-center", meta.fill)}>
                    <span className="stencil text-figure">{band}</span>
                  </div>
                  <div className="space-y-1 bg-surface-raised px-3 py-2.5">
                    <p className="text-ui font-medium text-ink">{meta.label}</p>
                    <p className="font-mono text-data-xs text-muted">{meta.range}</p>
                    <p className={cn("text-ui-sm", meta.ink)}>Band ink</p>
                    <p
                      className={cn(
                        "rounded-[3px] px-1.5 py-0.5 text-center text-ui-sm",
                        meta.chip,
                      )}
                    >
                      Wash chip
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-ui-sm text-muted">
            Greyscale check — the same ramp with colour removed. A 20 must still
            be distinguishable from a 6.
          </p>
          <div
            className="mt-2 grid gap-px overflow-hidden border border-rule sm:grid-cols-5"
            style={{ filter: "grayscale(1)" }}
          >
            {RISK_BANDS.map((band) => (
              <div
                key={band}
                className={cn("grid h-16 place-items-center", BAND_META[band].fill)}
              >
                <span className="stencil text-title-sm">{band * 5}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- type ---------------------------------------------- */}
        <Section
          title="Type scale"
          note="Three roles. Archivo Expanded for display, Geist Sans for UI, Geist Mono with tabular figures for data."
        >
          <div className="space-y-4">
            <Row label="figure · display">
              <p className="stencil text-figure text-ink">17</p>
            </Row>
            <Row label="title · display">
              <p className="font-display text-title font-bold text-ink">
                Pool plant room
              </p>
            </Row>
            <Row label="title-sm · display">
              <p className="font-display text-title-sm font-bold text-ink">
                Chlorine gas release
              </p>
            </Row>
            <Row label="eyebrow · display caps">
              <p className="eyebrow">Review due</p>
            </Row>
            <Row label="ui-lg · body">
              <p className="text-ui-lg text-ink">
                Acid and chlorine stored separately in bunded areas.
              </p>
            </Row>
            <Row label="ui · body">
              <p className="text-ui text-ink">
                Acid and chlorine stored separately in bunded areas.
              </p>
            </Row>
            <Row label="ui-sm · body (register density)">
              <p className="text-ui-sm text-ink">
                Acid and chlorine stored separately in bunded areas.
              </p>
            </Row>
            <Row label="data-xs · mono, tabular">
              <p className="font-mono text-data-xs text-ink">
                RA-BT-0001 · 30 Jul 2026 · 1×1 4×4 25 100%
              </p>
            </Row>
          </div>
        </Section>

        {/* ---- axis labels --------------------------------------- */}
        <Section title="Rating vocabulary" note="Shown against the matrix axes when authoring.">
          <div className="grid gap-8 sm:grid-cols-2">
            <dl className="space-y-1.5">
              <p className="eyebrow mb-2">Likelihood</p>
              {LIKELIHOOD_LABELS.map((label, i) => (
                <div key={label} className="flex items-baseline gap-3">
                  <dt className="stencil w-4 text-ui-sm text-muted">{i + 1}</dt>
                  <dd className="text-ui text-ink-soft">{label}</dd>
                </div>
              ))}
            </dl>
            <dl className="space-y-1.5">
              <p className="eyebrow mb-2">Severity</p>
              {SEVERITY_LABELS.map((label, i) => (
                <div key={label} className="flex items-baseline gap-3">
                  <dt className="stencil w-4 text-ui-sm text-muted">{i + 1}</dt>
                  <dd className="text-ui text-ink-soft">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        {/* ---- status and category ------------------------------- */}
        <Section
          title="Status and category"
          note="Risk owns colour. Status owns shape and weight; categories stay cool and low-chroma so they never compete with a risk tile in the same row."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {ASSESSMENT_STATUSES.map((status) => (
                <span
                  key={status}
                  className={cn(
                    "inline-block rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                    STATUS_META[status].chip,
                  )}
                >
                  {STATUS_META[status].label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {HAZARD_CATEGORIES.map((category) => (
                <span
                  key={category}
                  className={cn(
                    "inline-block rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                    CATEGORY_META[category].chip,
                  )}
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ---- buttons ------------------------------------------- */}
        <Section
          title="Buttons"
          note="No gradients, no shadow, no icon in every button. Large size is for the authoring flow, tapped one-handed on a tablet."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Sign off assessment</Button>
              <Button variant="ink">Create revision</Button>
              <Button variant="outline">Export PDF</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Remove finding</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="lg">
                Next hazard
              </Button>
              <Button variant="outline" size="lg">
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Show closed
              </Button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-title-sm font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-prose text-ui text-muted">{note}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid items-baseline gap-1 border-b border-rule pb-3 sm:grid-cols-[14rem_1fr]">
      <p className="font-mono text-data-xs text-faint">{label}</p>
      {children}
    </div>
  );
}
