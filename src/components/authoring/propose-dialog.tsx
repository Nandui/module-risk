"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { HAZARD_CATEGORIES, type HazardCategory } from "@/lib/vocab";
import { proposeControlMeasure, proposeHazard } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

/**
 * Proposing a library addition.
 *
 * Deliberately effortful. A hazard needs a full label, a category and a line
 * of guidance before it can be proposed, and it lands as pending_review
 * rather than joining the controlled vocabulary. Free-text hazards would
 * make cross-centre reporting impossible, which is the whole value here.
 */
export function ProposeDialog({
  kind,
  open,
  initialQuery,
  defaultCategory,
  onOpenChange,
  onProposed,
}: {
  kind: "hazard" | "control";
  open: boolean;
  initialQuery: string;
  defaultCategory: HazardCategory | null;
  onOpenChange: (open: boolean) => void;
  onProposed: (entry: { id: string; label: string; pending: boolean }) => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const isHazard = kind === "hazard";

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    setFieldErrors({});

    const result = isHazard
      ? await proposeHazard(formData)
      : await proposeControlMeasure(formData);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    const data = result.data as { id: string; label: string; review_state: string };
    const isPending = data.review_state === "pending_review";

    toast.success(
      isPending
        ? `“${data.label}” is added and flagged for the H&S lead to review.`
        : `“${data.label}” is now in the library.`,
    );

    onProposed({ id: data.id, label: data.label, pending: isPending });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 [animation:overlay-in_var(--duration-quick)_var(--ease-settle)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-sheet)] border border-rule bg-surface-raised p-6">
          <Dialog.Title className="font-display text-title-sm font-bold text-ink">
            {isHazard ? "Propose a new hazard" : "Propose a new control measure"}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-ui-sm text-muted">
            {isHazard
              ? "The H&S lead reviews every addition before it joins the library. Until then it works normally on this assessment and is marked as awaiting review."
              : "Controls are shared across every centre, so name it the way another assessor would recognise it."}
          </Dialog.Description>

          <form action={onSubmit} className="mt-5 space-y-4" noValidate>
            <Field
              label={isHazard ? "Hazard" : "Control measure"}
              htmlFor="propose-label"
              error={fieldErrors.label}
              hint={
                isHazard
                  ? "Name what can cause harm, not the consequence — “Damaged locker doors and fittings”, not “Cuts”."
                  : undefined
              }
            >
              <Input
                id="propose-label"
                name="label"
                defaultValue={initialQuery}
                autoFocus
                required
                inputSize="lg"
                aria-invalid={Boolean(fieldErrors.label)}
              />
            </Field>

            <Field label="Category" htmlFor="propose-category" error={fieldErrors.category}>
              <Select
                id="propose-category"
                name="category"
                defaultValue={defaultCategory ?? "Physical"}
                inputSize="lg"
              >
                {HAZARD_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>

            {isHazard ? (
              <Field
                label="Guidance"
                htmlFor="propose-guidance"
                error={fieldErrors.guidance}
                hint="One or two sentences on when this applies and what to look at."
              >
                <Textarea
                  id="propose-guidance"
                  name="guidance"
                  required
                  aria-invalid={Boolean(fieldErrors.guidance)}
                />
              </Field>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="border-l-2 border-risk-5 bg-risk-5-wash px-3 py-2 text-ui-sm text-risk-5-ink"
              >
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending
                  ? "Adding…"
                  : isHazard
                    ? "Add hazard"
                    : "Add control measure"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
