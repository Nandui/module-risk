"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Right-side sheet. Detail opens over the register so the reader never
 * loses their place in the list — not a full page navigation, not a
 * centred modal.
 *
 * It slides; it does not scale, bounce or fade up from below.
 */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "right" | "bottom";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-40 bg-ink/25 [animation:overlay-in_var(--duration-settle)_var(--ease-settle)]"
        style={{ backdropFilter: "blur(1px)" }}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden bg-surface-raised outline-none [animation:sheet-in_var(--duration-settle)_var(--ease-settle)]",
          side === "right"
            ? "inset-y-0 right-0 w-full border-l border-rule sm:max-w-[min(46rem,92vw)]"
            : "inset-x-0 bottom-0 max-h-[88vh] rounded-t-[var(--radius-sheet)] border-t border-rule",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-sunk hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-rule bg-surface-raised px-5 py-4 pr-14 sm:px-7",
        className,
      )}
      {...props}
    />
  );
}

export function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7", className)} {...props} />
  );
}

export function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-rule bg-surface px-5 py-3 sm:px-7",
        className,
      )}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-title-sm font-bold text-ink", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-ui-sm text-muted", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";
