"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Wraps the assessment document in the right-side sheet.
 *
 * Closing removes `?a=` and nothing else, so every other filter and the
 * scroll position survive — the reader never loses their place in the list.
 */
export function AssessmentSheet({
  title,
  reference,
  children,
}: {
  title: string;
  reference: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("a");
    const query = next.toString();
    router.push((query ? `?${query}` : "?") as Route, { scroll: false });
  };

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader className="flex items-baseline gap-3">
          <SheetTitle className="min-w-0 flex-1 truncate">{title}</SheetTitle>
          <span className="shrink-0 font-mono text-data-xs text-muted">{reference}</span>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}
