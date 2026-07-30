import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * No gradients, no icon in every button, no drop shadow. A button is a
 * rectangle with a label that says what happens.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] whitespace-nowrap font-medium transition-colors duration-[var(--duration-quick)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-ink",
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
        sm: "h-8 px-2.5 text-ui-sm",
        md: "h-9 px-3.5 text-ui",
        // Large targets for one-handed use on a site walk.
        lg: "h-12 px-5 text-ui-lg",
        icon: "size-9",
        "icon-sm": "size-7",
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
