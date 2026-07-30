import { cn } from "@/lib/utils";

/**
 * Page header. Eyebrow, title, and one line of orientation.
 *
 * Registers pass `bleed` so the header aligns with a full-bleed table rather
 * than sitting inside a measure it does not share.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-rule bg-surface-raised px-4 py-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-title font-bold text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-prose text-ui text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * An empty state. An invitation to act, not decoration — no illustration, no
 * shrug, and always a way forward.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="font-display text-title-sm font-bold text-ink">{title}</p>
      <p className="mt-2 text-ui text-muted">{children}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
