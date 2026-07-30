"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";

/**
 * A nav item. The current item is marked by weight and a left edge-rule
 * rather than by a filled pill — the rail should read as a list of places,
 * not a row of buttons.
 */
export function RailLink({
  href,
  label,
  children,
  variant = "rail",
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  variant?: "rail" | "bar";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bar") {
    return (
      <Link
        href={href as Route}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-0.5 py-2 text-ui-sm transition-colors duration-[var(--duration-quick)]",
          active ? "text-accent" : "text-muted",
        )}
      >
        {children}
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href as Route}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5 text-ui transition-colors duration-[var(--duration-quick)]",
        active
          ? "bg-surface-sunk font-medium text-ink"
          : "text-ink-soft hover:bg-surface-sunk hover:text-ink",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1.5 -left-2 w-[2px] bg-accent"
        />
      ) : null}
      {children}
      {label}
    </Link>
  );
}
