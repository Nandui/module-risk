import Link from "next/link";
import { FileDown, PencilLine } from "lucide-react";
import type { AssessmentDetail } from "@/lib/data/assessments";
import { BAND_META, LIKELIHOOD_LABELS, SEVERITY_LABELS, bandMeta } from "@/lib/risk";
import { CATEGORY_META, STATUS_META } from "@/lib/vocab";
import { cn, formatDate, formatDateTime, reviewLabel, sentenceList } from "@/lib/utils";
import { RiskDelta } from "@/components/risk/tile-chip";
import { TileMatrixStatic } from "@/components/risk/tile-matrix";
import { Meta } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { RevisionHistory } from "@/components/assessment/revision-history";

/**
 * The assessment as a document.
 *
 * Constrained measure, real hierarchy, no cards. This is the shape the PDF
 * takes as well — the print route renders this same component, so the
 * artefact an inspector reads is not a second implementation that can drift.
 */
export function AssessmentDocument({
  detail,
  variant = "screen",
}: {
  detail: AssessmentDetail;
  variant?: "screen" | "print";
}) {
  const { assessment, centre, findings } = detail;
  const status = STATUS_META[assessment.status];
  const isPrint = variant === "print";

  const worstMeta = detail.headlineResidual ? bandMeta(detail.headlineResidual) : null;
  const needingAction = findings.filter((f) => f.needsAction);

  return (
    <article className={cn("measure space-y-8", isPrint && "max-w-none")}>
      {/* ---- header ---------------------------------------------------- */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <p className="eyebrow">
              {centre?.name ?? "Unknown centre"}
              {detail.templateName ? ` · ${detail.templateName}` : ""}
            </p>
            <h1
              className={cn(
                "mt-1.5 font-display font-bold text-ink",
                isPrint ? "text-title" : "text-title",
              )}
            >
              {assessment.title}
            </h1>
          </div>

          {!isPrint ? (
            <div className="flex shrink-0 items-center gap-2 print-hide">
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/assessments/${assessment.id}/pdf`} prefetch={false}>
                  <FileDown aria-hidden />
                  PDF
                </Link>
              </Button>
              {assessment.status !== "signed_off" ? (
                <Button asChild variant="primary" size="sm">
                  <Link href={`/assessments/${assessment.id}/author`}>
                    <PencilLine aria-hidden />
                    Continue
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {assessment.scopeNote ? (
          <p className="text-ui-lg leading-relaxed text-ink-soft">
            {assessment.scopeNote}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-rule py-4 sm:grid-cols-4">
          <Meta label="Reference">{assessment.reference}</Meta>
          <Meta label="Assessor" mono={false}>
            {detail.assessor?.fullName ?? "Unassigned"}
          </Meta>
          <Meta label="Status" mono={false}>
            <span
              className={cn(
                "inline-block rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                status.chip,
              )}
            >
              {status.label}
            </span>
          </Meta>
          <Meta label="Review due">
            {formatDate(assessment.reviewDueAt)}
            <span
              className={cn(
                "mt-0.5 block font-sans text-ui-sm",
                detail.assessment.reviewDueAt &&
                  new Date(detail.assessment.reviewDueAt) < new Date()
                  ? "text-risk-5-ink"
                  : "text-muted",
              )}
            >
              {reviewLabel(assessment.reviewDueAt)}
            </span>
          </Meta>
        </dl>

        {/* ---- the headline numbers ------------------------------------ */}
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <Figure
            label="Highest residual risk"
            value={detail.headlineResidual || "—"}
            note={worstMeta?.label}
            noteClass={worstMeta?.ink}
          />
          <Figure label="Findings" value={findings.length} />
          <Figure
            label="Needing further action"
            value={needingAction.length}
            note={needingAction.length > 0 ? "at or above 10" : "none"}
          />
          {detail.headlineInitial > 0 ? (
            <div>
              <p className="eyebrow">Initial → residual</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="stencil text-title-sm text-ink">
                  {detail.headlineInitial}
                </span>
                <span aria-hidden className="text-muted">
                  →
                </span>
                <span className="stencil text-title-sm text-ink">
                  {detail.headlineResidual}
                </span>
                <span className="font-mono text-data-xs text-muted">
                  −
                  {Math.round(
                    ((detail.headlineInitial - detail.headlineResidual) /
                      detail.headlineInitial) *
                      100,
                  )}
                  %
                  <span className="sr-only">
                    {" "}
                    reduction from {detail.headlineInitial} to{" "}
                    {detail.headlineResidual}
                  </span>
                </span>
              </p>
            </div>
          ) : null}
        </div>

        {assessment.signedOffAt ? (
          <p className="border-l-2 border-ink bg-surface-sunk px-3 py-2 text-ui-sm text-ink-soft print-keep">
            Signed off by{" "}
            <strong className="font-medium text-ink">
              {detail.signedOffBy?.fullName ?? "a centre manager"}
            </strong>{" "}
            on{" "}
            <span className="font-mono text-data-xs">
              {formatDateTime(assessment.signedOffAt)}
            </span>
            . This record cannot be edited — a correction creates a new revision.
          </p>
        ) : null}
      </header>

      {/* ---- findings -------------------------------------------------- */}
      <section className="space-y-5">
        <h2 className="eyebrow border-b border-rule pb-2 print-keep-next">
          Findings ({findings.length})
        </h2>

        {findings.length === 0 ? (
          <p className="py-6 text-ui text-muted">
            No findings recorded yet. Work through the hazards to build the assessment.
          </p>
        ) : (
          <ol className="divide-y divide-rule">
            {findings.map((finding, index) => (
              <li key={finding.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 print-keep print-keep-next">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="font-mono text-data-xs text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                          CATEGORY_META[finding.hazardCategory].chip,
                        )}
                      >
                        {finding.hazardCategory}
                      </span>
                    </p>
                    <h3 className="mt-1.5 text-ui-lg font-medium text-ink">
                      {finding.hazardLabel}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    <RiskDelta
                      likelihood={finding.likelihood}
                      severity={finding.severity}
                      residualLikelihood={finding.residualLikelihood}
                      residualSeverity={finding.residualSeverity}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                  <dl className="space-y-3 text-ui">
                    <div>
                      <dt className="eyebrow">Who is at risk</dt>
                      <dd className="mt-1 text-ink-soft">
                        {finding.personsAtRisk.length > 0
                          ? sentenceList(finding.personsAtRisk)
                          : "Not recorded"}
                      </dd>
                    </div>

                    <div>
                      <dt className="eyebrow">
                        Controls in place ({finding.controls.length})
                      </dt>
                      <dd className="mt-1">
                        {finding.controls.length === 0 ? (
                          <span className="text-muted">None recorded</span>
                        ) : (
                          <ul className="space-y-0.5 text-ink-soft">
                            {finding.controls.map((control) => (
                              <li key={control.id} className="flex gap-2">
                                <span aria-hidden className="text-accent">
                                  ·
                                </span>
                                {control.label}
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>

                    {finding.notes ? (
                      <div>
                        <dt className="eyebrow">Notes</dt>
                        <dd className="mt-1 whitespace-pre-line text-ink-soft">
                          {finding.notes}
                        </dd>
                      </div>
                    ) : null}

                    <div className="print-keep">
                      <dt className="eyebrow">Risk rating</dt>
                      <dd className="mt-1 font-mono text-data-xs text-ink-soft">
                        Initial {finding.likelihood}×{finding.severity} ={" "}
                        {finding.initialScore}{" "}
                        <span className="text-muted">
                          ({LIKELIHOOD_LABELS[finding.likelihood - 1]} ×{" "}
                          {SEVERITY_LABELS[finding.severity - 1]})
                        </span>
                        <br />
                        Residual {finding.residualLikelihood}×
                        {finding.residualSeverity} = {finding.residualScore}{" "}
                        <span className="text-muted">
                          ({bandMeta(finding.residualScore).label})
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div className="shrink-0 print-keep">
                    <TileMatrixStatic
                      value={{
                        likelihood: finding.residualLikelihood,
                        severity: finding.residualSeverity,
                      }}
                    />
                  </div>
                </div>

                {finding.actions.length > 0 ? (
                  <div className="mt-4 border-l-2 border-accent-line bg-accent-wash/40 px-3 py-2.5 print-keep">
                    <p className="eyebrow">Actions ({finding.actions.length})</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {finding.actions.map((action) => (
                        <li key={action.id} className="text-ui">
                          <span
                            className={cn(
                              "text-ink-soft",
                              action.closedAt && "line-through decoration-muted",
                            )}
                          >
                            {action.description}
                          </span>
                          <span className="ml-2 font-mono text-data-xs text-muted">
                            {action.closedAt
                              ? `closed ${formatDate(action.closedAt)}`
                              : `due ${formatDate(action.dueAt)}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {!isPrint && detail.revisions.length > 0 ? (
        <RevisionHistory revisions={detail.revisions} />
      ) : null}

      {isPrint ? (
        <footer className="border-t border-rule pt-4 text-ui-sm text-muted print-keep">
          <p>
            {assessment.reference} · {centre?.name} · Generated{" "}
            {formatDateTime(new Date())}
          </p>
          <p className="mt-1">
            Risk score is likelihood (1–5) × severity (1–5), banded 1 to 5. Bands:{" "}
            {[1, 2, 3, 4, 5]
              .map((b) => {
                const meta = BAND_META[b as 1 | 2 | 3 | 4 | 5];
                return `${b} ${meta.label} ${meta.range}`;
              })
              .join(" · ")}
            .
          </p>
        </footer>
      ) : null}
    </article>
  );
}

function Figure({
  label,
  value,
  note,
  noteClass,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  noteClass?: string;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 stencil text-figure text-ink">{value}</p>
      {note ? (
        <p className={cn("mt-0.5 text-ui-sm", noteClass ?? "text-muted")}>{note}</p>
      ) : null}
    </div>
  );
}
