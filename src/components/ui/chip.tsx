import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A chip. Small, square-ish, hairline. Risk owns colour, so a chip that
 * carries anything other than risk stays neutral by default.
 */
export function Chip({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-ui-sm leading-tight",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** An eyebrow: the small caps display label used above sections. */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("eyebrow", className)} {...props} />;
}

/**
 * A key/value pair in a document header. The value is in the data role so
 * references and dates line up down the column.
 */
export function Meta({
  label,
  children,
  mono = true,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="eyebrow">{label}</dt>
      <dd
        className={cn(
          "text-ui text-ink",
          mono && "font-mono text-data-xs tracking-tight",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
