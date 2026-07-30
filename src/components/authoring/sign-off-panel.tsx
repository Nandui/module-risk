"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Send } from "lucide-react";
import type { AssessmentDetail } from "@/lib/data/assessments";
import type { AppProfile } from "@/lib/db";
import { createRevision, signOffAssessment, submitForReview } from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { formatDateTime } from "@/lib/utils";

/**
 * Sign-off: a distinct, deliberate final step with a clear statement of what
 * signing means.
 *
 * Not a Submit button. The person signing is attesting to something, and the
 * copy says exactly what — including that the record becomes immutable.
 */
export function SignOffPanel({
  detail,
  people,
  canSignOff,
  recordedCount,
  onBeforeSignOff,
}: {
  detail: AssessmentDetail;
  people: AppProfile[];
  canSignOff: boolean;
  recordedCount: number;
  onBeforeSignOff: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [revising, setRevising] = React.useState(false);

  const { assessment } = detail;
  const signer = people.find((p) => p.id === assessment.signedOffById);

  // ---- already signed off ----------------------------------------
  if (assessment.status === "signed_off") {
    return (
      <section className="border-t-2 border-ink pt-6">
        <div className="flex items-start gap-3">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-title-sm font-bold text-ink">
              Signed off and in force
            </h2>
            <p className="mt-1.5 text-ui text-ink-soft">
              Signed by {signer?.fullName ?? "a centre manager"} on{" "}
              <span className="font-mono text-data-xs">
                {formatDateTime(assessment.signedOffAt)}
              </span>
              . The record is now part of the audit trail and cannot be edited.
            </p>

            {canSignOff ? (
              revising ? (
                <form
                  action={async (formData) => {
                    setPending(true);
                    const result = await createRevision(formData);
                    setPending(false);
                    if (!result.ok) {
                      toast.error(result.error ?? "The revision could not be created.");
                      return;
                    }
                    toast.success(
                      "Revision created. The previous version is preserved in the history.",
                    );
                    setRevising(false);
                    router.refresh();
                  }}
                  className="mt-4 space-y-3"
                >
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <Field
                    label="What is being corrected?"
                    htmlFor="revision-reason"
                    hint="This becomes part of the audit trail, so be specific."
                  >
                    <Textarea id="revision-reason" name="reason" required autoFocus />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" variant="ink" disabled={pending}>
                      {pending ? "Creating revision…" : "Create revision and reopen"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setRevising(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setRevising(true)}
                >
                  Revise this assessment
                </Button>
              )
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const blocked = recordedCount === 0;

  return (
    <section className="border-t-2 border-ink pt-6">
      <h2 className="font-display text-title-sm font-bold text-ink">
        {canSignOff ? "Sign off this assessment" : "Send for review"}
      </h2>

      {blocked ? (
        <p className="mt-2 text-ui text-muted">
          Record at least one hazard with both ratings before this assessment can
          go anywhere.
        </p>
      ) : canSignOff ? (
        <>
          <p className="mt-2 text-ui text-ink-soft">
            {recordedCount} {recordedCount === 1 ? "finding is" : "findings are"}{" "}
            recorded.
          </p>

          <label className="mt-4 flex cursor-pointer items-start gap-3 border border-rule-strong bg-surface-sunk px-4 py-3.5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="text-ui text-ink-soft">
              I have walked this area, the hazards and controls recorded here
              reflect what is in place today, and the residual ratings are my
              professional judgement.{" "}
              <strong className="font-medium text-ink">
                Once signed off, this record cannot be edited — a correction
                creates a new revision.
              </strong>
            </span>
          </label>

          <Button
            variant="ink"
            size="lg"
            className="mt-4"
            disabled={!confirmed || pending}
            onClick={async () => {
              setPending(true);
              // Flush any pending autosave first, so the signed snapshot is
              // the work actually on screen.
              const settled = await onBeforeSignOff();
              if (!settled) {
                setPending(false);
                toast.error("Still saving the last change. Try again in a moment.");
                return;
              }

              const result = await signOffAssessment({ id: assessment.id, confirmed: true });
              setPending(false);

              if (!result.ok) {
                toast.error(result.error ?? "The assessment could not be signed off.");
                return;
              }
              toast.success("Signed off. The assessment is now in force.");
              router.push("/register");
            }}
          >
            {pending ? "Signing off…" : "Sign off assessment"}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-ui text-ink-soft">
            Your centre manager or the H&amp;S lead signs assessments off. Send
            it to them when the walk is done.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-4"
            disabled={pending || assessment.status === "in_review"}
            onClick={async () => {
              setPending(true);
              await onBeforeSignOff();
              const result = await submitForReview(assessment.id);
              setPending(false);
              if (!result.ok) {
                toast.error(result.error ?? "That could not be sent for review.");
                return;
              }
              toast.success("Sent for review.");
              router.refresh();
            }}
          >
            <Send aria-hidden />
            {assessment.status === "in_review"
              ? "Already sent for review"
              : pending
                ? "Sending…"
                : "Send for review"}
          </Button>
        </>
      )}
    </section>
  );
}
