import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * No gradients, no icon in every button, no drop shadow, no large radius. A
 * button is a rectangle with a label that says what happens.
 *
 * Compact by default — 28 and 32px, the density a keyboard-driven tool wants.
 * The 40px size is not a visual choice and must not be traded away for
 * balance: it exists for one-handed tablet use during a site walk.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] whitespace-nowrap font-medium transition-[background-color,border-color,color] duration-[var(--duration-quick)] ease-[var(--ease-settle)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent-solid text-white hover:bg-accent-solid-hover",
        // Sign-off and other terminal actions read in ink, not in brand —
        // they are heavier than a normal primary action.
        ink: "bg-ink text-surface-raised hover:bg-ink-soft",
        outline:
          "border border-rule-strong bg-surface-raised text-ink hover:bg-surface-sunk",
        ghost: "text-ink-soft hover:bg-surface-sunk hover:text-ink",
        link: "text-accent underline decoration-accent-line underline-offset-4 hover:decoration-accent",
        danger:
          "border border-risk-5 bg-risk-5-wash text-risk-5-ink hover:bg-risk-5 hover:text-white",
      },
      size: {
        sm: "h-7 px-2 text-ui-sm",
        md: "h-8 px-2.5 text-ui",
        // Large targets for one-handed use on a site walk.
        lg: "h-10 px-4 text-ui-lg",
        icon: "size-8",
        "icon-sm": "size-6",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
