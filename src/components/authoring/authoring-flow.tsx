"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import type { ControlMeasure, Hazard } from "@prisma/client";
import type { AppProfile } from "@/lib/db";
import type { AssessmentDetail } from "@/lib/data/assessments";
import { PERSONS_AT_RISK, CATEGORY_META, type HazardCategory, type PersonAtRisk } from "@/lib/vocab";
import { bandMeta, riskScore, needsAction } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { deleteFinding, saveFinding } from "@/lib/actions/assessments";
import { TileMatrix, type MatrixValue } from "@/components/risk/tile-matrix";
import { TileChip } from "@/components/risk/tile-chip";
import { HazardTypeahead } from "@/components/authoring/hazard-typeahead";
import { ControlPicker } from "@/components/authoring/control-picker";
import { PhotoCapture } from "@/components/authoring/photo-capture";
import { ProposeDialog } from "@/components/authoring/propose-dialog";
import { AutosaveIndicator, type SaveState } from "@/components/authoring/autosave-indicator";
import { SignOffPanel } from "@/components/authoring/sign-off-panel";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";

interface Draft {
  /** Server id once saved; undefined while the row is new. */
  id?: string;
  key: string;
  hazardId: string | null;
  initial: MatrixValue | null;
  residual: MatrixValue | null;
  controlIds: string[];
  persons: PersonAtRisk[];
  notes: string;
  photoIds: string[];
}

const AUTOSAVE_DELAY = 800;

/**
 * The authoring flow — the Create job.
 *
 * Generous spacing, large inputs, one hazard at a time. Autosave throughout:
 * there is no Save button, because a Save button can be forgotten mid-walk
 * and a half-recorded assessment is worse than none.
 */
export function AuthoringFlow({
  detail,
  hazards,
  controls,
  people,
  templateHazardIds,
  canSignOff,
}: {
  detail: AssessmentDetail;
  hazards: Hazard[];
  controls: ControlMeasure[];
  people: AppProfile[];
  templateHazardIds: string[];
  canSignOff: boolean;
}) {
  const router = useRouter();
  const locked = detail.assessment.status === "signed_off";

  const [drafts, setDrafts] = React.useState<Draft[]>(() => {
    const existing: Draft[] = detail.findings.map((f) => ({
      id: f.id,
      key: f.id,
      hazardId: f.hazardId,
      initial: { likelihood: f.likelihood, severity: f.severity },
      residual: {
        likelihood: f.residualLikelihood,
        severity: f.residualSeverity,
      },
      controlIds: [...f.controlMeasureIds],
      persons: [...f.personsAtRisk],
      notes: f.notes ?? "",
      photoIds: [...f.photoIds],
    }));

    // The template walks the assessor through its hazards; any not yet
    // recorded are queued as empty drafts in template order.
    const seen = new Set(existing.map((d) => d.hazardId));
    const queued: Draft[] = templateHazardIds
      .filter((id) => !seen.has(id))
      .map((id) => blankDraft(id));

    const all = [...existing, ...queued];
    return all.length > 0 ? all : [blankDraft(null)];
  });

  const [index, setIndex] = React.useState(() => {
    const firstIncomplete = drafts.findIndex((d) => !isComplete(d));
    return firstIncomplete === -1 ? 0 : firstIncomplete;
  });

  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [saveError, setSaveError] = React.useState<string>();
  const [proposing, setProposing] = React.useState<{
    kind: "hazard" | "control";
    query: string;
  } | null>(null);

  // Library additions made mid-flow appear immediately without a reload.
  const [extraHazards, setExtraHazards] = React.useState<Hazard[]>([]);
  const [extraControls, setExtraControls] = React.useState<ControlMeasure[]>([]);

  const allHazards = React.useMemo(
    () => [...hazards, ...extraHazards].sort((a, b) => a.label.localeCompare(b.label)),
    [hazards, extraHazards],
  );
  const allControls = React.useMemo(
    () => [...controls, ...extraControls].sort((a, b) => a.label.localeCompare(b.label)),
    [controls, extraControls],
  );

  const hazardById = React.useMemo(
    () => new Map(allHazards.map((h) => [h.id, h])),
    [allHazards],
  );

  const current = drafts[index];
  const usedHazardIds = React.useMemo(
    () => new Set(drafts.map((d) => d.hazardId).filter((v): v is string => Boolean(v))),
    [drafts],
  );

  // ---- autosave --------------------------------------------------
  // Keyed on the draft's contents. A save fires once the draft is complete
  // enough to be a valid row; an incomplete draft is held in the client
  // rather than written as a half-record.
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlight = React.useRef(false);
  const savedSignature = React.useRef(new Map<string, string>());

  const persist = React.useCallback(
    async (draft: Draft) => {
      if (locked || !isComplete(draft)) return;

      const signature = JSON.stringify([
        draft.hazardId,
        draft.initial,
        draft.residual,
        [...draft.controlIds].sort(),
        [...draft.persons].sort(),
        draft.notes,
        [...draft.photoIds].sort(),
      ]);
      if (savedSignature.current.get(draft.key) === signature) return;

      inFlight.current = true;
      setSaveState("saving");

      const result = await saveFinding({
        id: draft.id,
        assessmentId: detail.assessment.id,
        hazardId: draft.hazardId,
        likelihood: draft.initial!.likelihood,
        severity: draft.initial!.severity,
        controlMeasureIds: draft.controlIds,
        residualLikelihood: draft.residual!.likelihood,
        residualSeverity: draft.residual!.severity,
        personsAtRisk: draft.persons,
        notes: draft.notes || undefined,
        photoIds: draft.photoIds,
      });

      inFlight.current = false;

      if (!result.ok) {
        setSaveState("error");
        setSaveError(
          result.error ??
            Object.values(result.fieldErrors ?? {})[0] ??
            "That did not save.",
        );
        return;
      }

      savedSignature.current.set(draft.key, signature);
      const savedId = (result.data as { id: string } | undefined)?.id;
      if (savedId && !draft.id) {
        setDrafts((prev) =>
          prev.map((d) => (d.key === draft.key ? { ...d, id: savedId } : d)),
        );
      }
      setSaveState("saved");
      setSaveError(undefined);
    },
    [detail.assessment.id, locked],
  );

  React.useEffect(() => {
    if (!current || locked) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(current), AUTOSAVE_DELAY);
    return () => clearTimeout(timer.current);
  }, [current, persist, locked]);

  // A tab close mid-walk should not lose the last few seconds of work.
  React.useEffect(() => {
    const onHide = () => {
      if (current && !locked) void persist(current);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [current, persist, locked]);

  const update = (patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addHazard = () => {
    setDrafts((prev) => [...prev, blankDraft(null)]);
    setIndex(drafts.length);
  };

  const removeCurrent = async () => {
    const draft = current;
    if (!draft) return;
    if (draft.id) {
      const result = await deleteFinding(draft.id, detail.assessment.id);
      if (!result.ok) {
        toast.error(result.error ?? "That finding could not be removed.");
        return;
      }
    }
    setDrafts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [blankDraft(null)];
    });
    setIndex((i) => Math.max(0, i - 1));
    router.refresh();
  };

  if (!current) return null;

  const hazard = current.hazardId ? hazardById.get(current.hazardId) : null;
  const category = (hazard?.category ?? null) as HazardCategory | null;
  const initialScore = current.initial
    ? riskScore(current.initial.likelihood, current.initial.severity)
    : null;
  const residualScore = current.residual
    ? riskScore(current.residual.likelihood, current.residual.severity)
    : null;
  const residualTooHigh =
    initialScore !== null && residualScore !== null && residualScore > initialScore;

  const completeCount = drafts.filter(isComplete).length;

  return (
    <div className="md:grid md:grid-cols-[16rem_1fr]">
      {/* ---- progress rail ------------------------------------------ */}
      <aside className="border-b border-rule bg-surface md:sticky md:top-0 md:h-[calc(100dvh)] md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="px-4 py-3">
          <p className="eyebrow">Progress</p>
          <p className="mt-1.5 font-mono text-data-xs text-ink-soft">
            {completeCount} of {drafts.length} recorded
          </p>
          <div
            aria-hidden
            className="mt-2 flex h-1 gap-px overflow-hidden bg-rule"
          >
            {drafts.map((draft) => (
              <span
                key={draft.key}
                className={cn(
                  "flex-1",
                  isComplete(draft) ? "bg-accent" : "bg-rule",
                )}
              />
            ))}
          </div>
        </div>

        <ol className="border-t border-rule">
          {drafts.map((draft, i) => {
            const h = draft.hazardId ? hazardById.get(draft.hazardId) : null;
            const score = draft.residual
              ? riskScore(draft.residual.likelihood, draft.residual.severity)
              : null;
            return (
              <li key={draft.key}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index || undefined}
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-rule px-4 py-2.5 text-left transition-colors duration-[var(--duration-quick)]",
                    i === index ? "bg-surface-raised" : "hover:bg-surface-sunk",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center font-mono text-stencil-xs",
                      isComplete(draft)
                        ? "bg-accent text-white"
                        : "bg-surface-sunk text-muted",
                    )}
                  >
                    {isComplete(draft) ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-ui-sm",
                      i === index ? "font-medium text-ink" : "text-ink-soft",
                    )}
                  >
                    {h?.label ?? "No hazard chosen"}
                  </span>
                  {score ? (
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center stencil text-stencil-xs",
                        bandMeta(score).fill,
                      )}
                    >
                      {score}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        {!locked ? (
          <div className="p-3">
            <Button variant="outline" size="sm" onClick={addHazard} className="w-full">
              <Plus aria-hidden />
              Add another hazard
            </Button>
          </div>
        ) : null}
      </aside>

      {/* ---- the current hazard ------------------------------------- */}
      <div className="min-w-0">
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule bg-surface-raised px-4 py-3 sm:px-8">
          <p className="eyebrow">
            Hazard {index + 1} of {drafts.length}
          </p>
          <AutosaveIndicator
            state={locked ? "idle" : saveState}
            error={saveError}
          />
        </div>

        {/* Generous spacing and large inputs: this is filled in on a tablet
            while walking a site. */}
        <div className="mx-auto max-w-2xl space-y-10 px-4 py-8 sm:px-8">
          <section className="space-y-3">
            <div>
              <label
                htmlFor="hazard"
                className="font-display text-title-sm font-bold text-ink"
              >
                What is the hazard?
              </label>
              <p className="mt-1 text-ui text-muted">
                Chosen from the shared library so every centre records the same
                hazard the same way.
              </p>
            </div>

            <HazardTypeahead
              id="hazard"
              hazards={allHazards}
              value={current.hazardId}
              usedIds={usedHazardIds}
              disabled={locked}
              onChange={(hazardId) => update({ hazardId })}
              onProposeNew={(query) => setProposing({ kind: "hazard", query })}
            />

            {hazard?.guidance ? (
              <p className="border-l-2 border-accent-line bg-accent-wash/50 px-3 py-2.5 text-ui text-ink-soft">
                {hazard.guidance}
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <fieldset>
              <legend className="font-display text-title-sm font-bold text-ink">
                Who is at risk?
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {PERSONS_AT_RISK.map((person) => {
                  const isOn = current.persons.includes(person);
                  return (
                    <button
                      key={person}
                      type="button"
                      role="checkbox"
                      aria-checked={isOn}
                      disabled={locked}
                      onClick={() =>
                        update({
                          persons: isOn
                            ? current.persons.filter((p) => p !== person)
                            : [...current.persons, person],
                        })
                      }
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border px-3.5 text-ui-lg transition-colors duration-[var(--duration-quick)]",
                        isOn
                          ? "border-accent bg-accent-wash text-accent-ink"
                          : "border-rule-strong bg-surface-raised text-ink-soft hover:border-rule-strong",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-[2px] border",
                          isOn ? "border-accent bg-accent text-white" : "border-rule-strong",
                        )}
                      >
                        {isOn ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                      {person}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </section>

          <section className="space-y-3">
            <div>
              <p id="initial-label" className="font-display text-title-sm font-bold text-ink">
                Rate the risk before controls
              </p>
              <p className="mt-1 text-ui text-muted">
                Tap the cell where this hazard sits with nothing in place to stop it.
              </p>
            </div>
            <TileMatrix
              labelledBy="initial-label"
              value={current.initial}
              disabled={locked}
              onChange={(initial) => {
                // Residual can never exceed initial; if lowering the initial
                // rating would invert them, bring residual down with it
                // rather than making the assessor fix an error we caused.
                const next: Partial<Draft> = { initial };
                if (
                  current.residual &&
                  riskScore(current.residual.likelihood, current.residual.severity) >
                    riskScore(initial.likelihood, initial.severity)
                ) {
                  next.residual = initial;
                }
                update(next);
              }}
            />
          </section>

          <section className="space-y-3">
            <div>
              <p id="controls-label" className="font-display text-title-sm font-bold text-ink">
                What controls are in place?
              </p>
              <p className="mt-1 text-ui text-muted">
                Only the controls that actually exist on site today. Anything
                still needed is an action, further down.
              </p>
            </div>
            <ControlPicker
              labelledBy="controls-label"
              controls={allControls}
              selected={current.controlIds}
              category={category}
              disabled={locked}
              onChange={(controlIds) => update({ controlIds })}
              onProposeNew={(query) => setProposing({ kind: "control", query })}
            />
          </section>

          <section className="space-y-3">
            <div>
              <p className="font-display text-title-sm font-bold text-ink">
                Photo evidence
              </p>
              <p className="mt-1 text-ui text-muted">
                Optional, but a photo settles an argument about what a control
                looked like on the day.
              </p>
            </div>
            <PhotoCapture
              centreId={detail.assessment.centreId}
              assessmentId={detail.assessment.id}
              photoIds={current.photoIds}
              disabled={locked}
              onChange={(photoIds) => update({ photoIds })}
            />
          </section>

          <section className="space-y-3">
            <div>
              <p id="residual-label" className="font-display text-title-sm font-bold text-ink">
                Rate the risk with those controls
              </p>
              <p className="mt-1 text-ui text-muted">
                The residual risk. This is the number that carries into the
                register and the report.
              </p>
            </div>
            <TileMatrix
              labelledBy="residual-label"
              value={current.residual}
              disabled={locked}
              onChange={(residual) => update({ residual })}
            />

            {residualTooHigh ? (
              <p
                role="alert"
                className="border-l-2 border-risk-5 bg-risk-5-wash px-3 py-2 text-ui-sm text-risk-5-ink"
              >
                Residual risk cannot be higher than the initial risk — controls
                only ever reduce it. Lower this rating, or raise the initial one.
              </p>
            ) : null}

            {initialScore !== null && residualScore !== null && !residualTooHigh ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-3">
                <span className="eyebrow">Effect of the controls</span>
                <TileChip likelihood={current.initial!.likelihood} severity={current.initial!.severity} size="sm" />
                <span aria-hidden className="text-muted">→</span>
                <TileChip
                  likelihood={current.residual!.likelihood}
                  severity={current.residual!.severity}
                />
                <span className="font-mono text-data-xs text-muted">
                  {initialScore === residualScore
                    ? "no reduction"
                    : `−${Math.round(((initialScore - residualScore) / initialScore) * 100)}%`}
                </span>
                {needsAction(residualScore) ? (
                  <span className="text-ui-sm text-risk-4-ink">
                    At or above 10 — this needs an action to bring it down.
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>

          <section>
            <Field
              label="Notes"
              htmlFor="notes"
              hint="Anything specific to this site that the next assessor should know."
            >
              <Textarea
                id="notes"
                value={current.notes}
                disabled={locked}
                onChange={(event) => update({ notes: event.target.value })}
              />
            </Field>
          </section>

          {/* ---- move between hazards -------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
            <Button
              variant="outline"
              size="lg"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ArrowLeft aria-hidden />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {!locked ? (
                <Button variant="ghost" size="lg" onClick={() => void removeCurrent()}>
                  <Trash2 aria-hidden />
                  Remove
                </Button>
              ) : null}

              {index < drafts.length - 1 ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setIndex((i) => Math.min(drafts.length - 1, i + 1))}
                >
                  Next hazard
                  <ArrowRight aria-hidden />
                </Button>
              ) : (
                <Button variant="primary" size="lg" onClick={addHazard} disabled={locked}>
                  <Plus aria-hidden />
                  Add another hazard
                </Button>
              )}
            </div>
          </div>

          {/* ---- sign-off ------------------------------------------- */}
          <SignOffPanel
            detail={detail}
            people={people}
            canSignOff={canSignOff}
            recordedCount={completeCount}
            onBeforeSignOff={async () => {
              clearTimeout(timer.current);
              if (current) await persist(current);
              return !inFlight.current;
            }}
          />
        </div>
      </div>

      {proposing ? (
        <ProposeDialog
          kind={proposing.kind}
          open
          initialQuery={proposing.query}
          defaultCategory={category}
          onOpenChange={(open) => !open && setProposing(null)}
          onProposed={(entry) => {
            if (proposing.kind === "hazard") {
              const row: Hazard = {
                id: entry.id,
                label: entry.label,
                category: category ?? "Physical",
                guidance: null,
                reviewState: entry.pending ? "pending_review" : "approved",
                createdById: null,
                createdAt: new Date(),
              };
              setExtraHazards((prev) => [...prev, row]);
              update({ hazardId: entry.id });
            } else {
              const row: ControlMeasure = {
                id: entry.id,
                label: entry.label,
                category: category ?? "Physical",
                reviewState: entry.pending ? "pending_review" : "approved",
                createdById: null,
                createdAt: new Date(),
              };
              setExtraControls((prev) => [...prev, row]);
              update({ controlIds: [...current.controlIds, entry.id] });
            }
          }}
        />
      ) : null}
    </div>
  );
}

function blankDraft(hazardId: string | null): Draft {
  return {
    key: `new-${Math.random().toString(36).slice(2)}`,
    hazardId,
    initial: null,
    residual: null,
    controlIds: [],
    persons: [],
    notes: "",
    photoIds: [],
  };
}

/** Enough to be a valid row: a hazard and both ratings. */
function isComplete(draft: Draft): boolean {
  return Boolean(draft.hazardId && draft.initial && draft.residual);
}
