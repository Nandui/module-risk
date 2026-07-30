"use client";

import * as React from "react";
import { Check } from "lucide-react";
import type { CentreRow, TemplateRow } from "@/lib/db/types";
import { REVIEW_FREQUENCIES, CATEGORY_META } from "@/lib/vocab";
import { createAssessment } from "@/lib/actions/assessments";
import { cn, plural } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export function NewAssessmentForm({
  centres,
  templates,
  defaultCentreId,
}: {
  centres: CentreRow[];
  templates: TemplateRow[];
  defaultCentreId: string | null;
}) {
  const [centreId, setCentreId] = React.useState(defaultCentreId ?? centres[0]?.id ?? "");
  const [templateId, setTemplateId] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [titleEdited, setTitleEdited] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const template = templates.find((t) => t.id === templateId);

  // The template names the assessment unless the assessor overrides it —
  // one less thing to type standing in a plant room.
  React.useEffect(() => {
    if (!titleEdited && template) setTitle(template.name);
  }, [template, titleEdited]);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError(undefined);
        setFieldErrors({});
        const result = await createAssessment(formData);
        // Success redirects into the authoring flow.
        setPending(false);
        setError(result?.error);
        setFieldErrors(result?.fieldErrors ?? {});
      }}
      className="measure space-y-8"
      noValidate
    >
      <Field label="Centre" htmlFor="centre_id" error={fieldErrors.centre_id}>
        <Select
          id="centre_id"
          name="centre_id"
          inputSize="lg"
          value={centreId}
          onChange={(event) => setCentreId(event.target.value)}
          required
        >
          {centres.map((centre) => (
            <option key={centre.id} value={centre.id}>
              {centre.name} ({centre.code})
            </option>
          ))}
        </Select>
      </Field>

      <fieldset>
        <legend className="block text-ui-sm font-medium text-ink-soft">Template</legend>
        <p className="mt-1 text-ui-sm text-muted">
          Sets the hazards you are walked through. You can add or skip any of
          them as you go.
        </p>
        <input type="hidden" name="template_id" value={templateId} />

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {templates.map((option) => {
            const isOn = option.id === templateId;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isOn}
                onClick={() => setTemplateId(isOn ? "" : option.id)}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius)] border px-3.5 py-3 text-left transition-colors duration-[var(--duration-quick)]",
                  isOn
                    ? "border-accent bg-accent-wash"
                    : "border-rule-strong bg-surface-raised hover:border-rule-strong",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                    isOn ? "border-accent bg-accent text-white" : "border-rule-strong",
                  )}
                >
                  {isOn ? <Check className="size-2.5" strokeWidth={4} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-ui-lg text-ink">{option.name}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-data-xs text-muted">
                      {option.hazard_ids.length}{" "}
                      {plural(option.hazard_ids.length, "hazard")}
                    </span>
                    <span
                      className={cn(
                        "rounded-[3px] px-1.5 py-0.5 text-ui-sm leading-tight",
                        CATEGORY_META[option.category].chip,
                      )}
                    >
                      {option.category}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Title"
        htmlFor="title"
        error={fieldErrors.title}
        hint="How this will appear in the register."
      >
        <Input
          id="title"
          name="title"
          inputSize="lg"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleEdited(true);
          }}
          required
          aria-invalid={Boolean(fieldErrors.title)}
        />
      </Field>

      <Field
        label="Scope"
        htmlFor="scope_note"
        error={fieldErrors.scope_note}
        hint="What this assessment covers, and anything it deliberately excludes."
      >
        <Textarea id="scope_note" name="scope_note" />
      </Field>

      <Field
        label="Review every"
        htmlFor="review_frequency_months"
        error={fieldErrors.review_frequency_months}
      >
        <Select
          id="review_frequency_months"
          name="review_frequency_months"
          inputSize="lg"
          defaultValue={12}
        >
          {REVIEW_FREQUENCIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-risk-5 bg-risk-5-wash px-3 py-2 text-ui-sm text-risk-5-ink"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Starting…" : "Start the assessment"}
      </Button>
    </form>
  );
}
