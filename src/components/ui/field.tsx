"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

/**
 * Inputs. Two densities: `md` for the register's filter row, `lg` for the
 * authoring form, where an assessor is tapping on a tablet.
 *
 * Every field is labelled. Errors are wired with aria-describedby and
 * aria-invalid rather than being a red sentence floating near a box.
 */

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("block text-ui-sm font-medium text-ink-soft", className)}
    {...props}
  />
));
Label.displayName = "Label";

const fieldBase =
  "w-full rounded-[var(--radius)] border border-rule-strong bg-surface-raised text-ink placeholder:text-muted transition-colors duration-[var(--duration-quick)] hover:border-rule-strong focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent aria-[invalid=true]:border-risk-5 disabled:bg-surface-sunk disabled:text-muted";

const sizes = {
  md: "h-9 px-2.5 text-ui",
  lg: "h-12 px-3.5 text-ui-lg",
} as const;

export interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  inputSize?: keyof typeof sizes;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "md", ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, sizes[inputSize], className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, "min-h-24 resize-y px-3.5 py-2.5 text-ui-lg", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export interface SelectProps extends Omit<React.ComponentProps<"select">, "size"> {
  inputSize?: keyof typeof sizes;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, inputSize = "md", ...props }, ref) => (
    <select
      ref={ref}
      className={cn(fieldBase, sizes[inputSize], "cursor-pointer pr-8", className)}
      {...props}
    />
  ),
);
Select.displayName = "Select";

/** Label, control and error as one block with the wiring already done. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {hint ? (
        <p id={hintId} className="text-ui-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-ui-sm text-risk-5-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** ids for aria-describedby, so the caller does not hand-build them. */
export function describedBy(id: string, hint?: string, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}
