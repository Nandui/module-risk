"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Waves } from "lucide-react";
import type { CentreRow } from "@/lib/db/types";
import { setCentre } from "@/lib/actions/misc";
import { ALL_CENTRES } from "@/lib/centre";
import { cn } from "@/lib/utils";

/**
 * Centre switcher, at the top of the rail.
 *
 * Single organisation, multiple centres — this is not an org picker and it
 * never becomes one. "All centres" is a real position, not a null state: the
 * group H&S lead lives there.
 */
export function CentreSwitcher({
  centres,
  centreId,
}: {
  centres: CentreRow[];
  centreId: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const router = useRouter();

  const current = centreId ? centres.find((c) => c.id === centreId) : null;

  const choose = (value: string) => {
    setPending(value);
    setOpen(false);
    void setCentre(value).then(() => {
      setPending(null);
      router.refresh();
    });
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2 py-2 text-left transition-colors duration-[var(--duration-quick)]",
          "hover:bg-surface-sunk",
          pending && "opacity-60",
        )}
        aria-label={`Centre: ${current?.name ?? "All centres"}. Change centre.`}
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center bg-ink text-surface-raised"
        >
          {current ? (
            <span className="stencil text-ui-sm">{current.code}</span>
          ) : (
            <Waves className="size-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">Centre</span>
          <span className="mt-0.5 block truncate text-ui font-medium text-ink">
            {current?.name ?? "All centres"}
          </span>
        </span>
        <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-faint" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-(--radix-popover-trigger-width) min-w-56 overflow-hidden rounded-[var(--radius)] border border-rule bg-surface-raised p-1"
        >
          <Option
            selected={centreId === null}
            onSelect={() => choose(ALL_CENTRES)}
            code={null}
            name="All centres"
            detail="Group-level view"
          />
          <div role="separator" className="my-1 h-px bg-rule" />
          {centres.map((centre) => (
            <Option
              key={centre.id}
              selected={centre.id === centreId}
              onSelect={() => choose(centre.id)}
              code={centre.code}
              name={centre.name}
              detail={centre.address ?? undefined}
            />
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Option({
  selected,
  onSelect,
  code,
  name,
  detail,
}: {
  selected: boolean;
  onSelect: () => void;
  code: string | null;
  name: string;
  detail?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className="flex w-full items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left transition-colors duration-[var(--duration-quick)] hover:bg-surface-sunk"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center stencil text-[0.625rem]",
          selected ? "bg-ink text-surface-raised" : "bg-surface-sunk text-muted",
        )}
      >
        {code ?? "ALL"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ui text-ink">{name}</span>
        {detail ? (
          <span className="block truncate text-ui-sm text-faint">{detail}</span>
        ) : null}
      </span>
      {selected ? <Check aria-hidden className="size-3.5 shrink-0 text-accent" /> : null}
    </button>
  );
}
