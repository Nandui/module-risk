import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/data/session";
import { getActions, groupByOwner } from "@/lib/data/actions";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { ActionsList } from "@/components/actions/actions-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Actions" };

/**
 * A flat list of open actions across all centres, grouped by owner and due
 * date. This is the screen that actually gets things fixed, so it reaches
 * across centres even when one centre is selected in the rail.
 */
export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string; centre?: string }>;
}) {
  const [session, { closed }] = await Promise.all([requireSession(), searchParams]);

  const includeClosed = closed === "1";
  const rows = await getActions(null, includeClosed);

  const groups = groupByOwner(rows);
  const overdue = rows.filter((r) => r.state === "overdue").length;

  return (
    <>
      <PageHeader
        eyebrow="Every centre"
        title="Actions"
        description={
          overdue > 0
            ? `${overdue} of ${rows.length} open actions are past their due date.`
            : "Everything outstanding across the group, grouped by who owns it."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={includeClosed ? "/actions" : "/actions?closed=1"}>
              {includeClosed ? "Hide closed" : "Show closed"}
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing outstanding">
          {includeClosed
            ? "No actions have been raised yet. They come from findings whose residual risk is 10 or above."
            : "Every action is closed. New ones appear here as findings are recorded."}
        </EmptyState>
      ) : (
        <ActionsList groups={groups} currentUserId={session.profile.id} />
      )}
    </>
  );
}
