import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { differenceInCalendarDays, format, formatDistanceToNowStrict } from "date-fns";
import { DUE_SOON_DAYS, type ActionState } from "@/lib/vocab";

/**
 * The type scale is named (`text-ui`, `text-figure`…) rather than sized
 * (`text-sm`), which tailwind-merge cannot know about: out of the box it reads
 * `text-ui` as a *colour* and silently drops whichever of `text-ui` and
 * `text-risk-5-on` came first. Registering the scale is what stops a merge
 * from eating a colour — the failure is invisible until something renders
 * black on black.
 */
const FONT_SIZES = [
  "eyebrow",
  "stencil-xs",
  "data-xs",
  "ui-sm",
  "ui",
  "ui-lg",
  "title-sm",
  "title",
  "figure",
  "signage",
] as const;

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}

/** Dates always render in the data role, so one format everywhere. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "dd MMM yyyy");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "dd MMM yyyy, HH:mm");
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  return differenceInCalendarDays(new Date(value), new Date());
}

/**
 * Review state for a register row. Overdue is visually distinct without
 * being alarming — the copy carries the weight, not the colour.
 */
export type ReviewState = "none" | "scheduled" | "due_soon" | "overdue";

export function reviewState(reviewDueAt: string | Date | null | undefined): ReviewState {
  const days = daysUntil(reviewDueAt);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "due_soon";
  return "scheduled";
}

export function reviewLabel(reviewDueAt: string | Date | null | undefined): string {
  const days = daysUntil(reviewDueAt);
  if (days === null) return "Not scheduled";
  if (days < 0) return `${Math.abs(days)} ${plural(Math.abs(days), "day")} overdue`;
  if (days === 0) return "Due today";
  return `in ${days} ${plural(days, "day")}`;
}

export function actionState(action: {
  due_at: string | null;
  closed_at: string | null;
}): ActionState {
  if (action.closed_at) return "closed";
  const days = daysUntil(action.due_at);
  if (days === null) return "open";
  if (days < 0) return "overdue";
  if (days <= 14) return "due_soon";
  return "open";
}

export function plural(n: number, word: string, suffix = "s"): string {
  return n === 1 ? word : `${word}${suffix}`;
}

export function relative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

/** A list read as a sentence: "Staff, customers and visitors". */
export function sentenceList(items: readonly string[]): string {
  if (items.length === 0) return "—";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
