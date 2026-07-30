import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/data/session";
import { getAssessment, getRegister } from "@/lib/data/assessments";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { RegisterTable } from "@/components/register/register-table";
import { AssessmentSheet } from "@/components/assessment/assessment-sheet";
import { AssessmentDocument } from "@/components/assessment/assessment-document";
import { BandKey } from "@/components/risk/tile-chip";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Register" };

/**
 * The register — the default landing view.
 *
 * Full-bleed: density is the point. The detail sheet is driven by `?a=<id>`
 * so a row is deep-linkable and the list never navigates away.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const [session, { a: selectedId }] = await Promise.all([
    requireSession(),
    searchParams,
  ]);

  const rows = await getRegister(session.centreId);

  return (
    <>
      <PageHeader
        eyebrow={session.centre ? session.centre.name : "All centres"}
        title="Register"
        description={
          session.centre
            ? `Every risk assessment at ${session.centre.name}.`
            : "Every risk assessment across the group."
        }
        actions={
          <Button asChild variant="primary" size="sm" className="hidden md:inline-flex">
            <Link href="/assessments/new">
              <Plus aria-hidden />
              New assessment
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No assessments here yet"
          action={
            <Button asChild variant="primary">
              <Link href="/assessments/new">Start the first assessment</Link>
            </Button>
          }
        >
          {session.centre
            ? `${session.centre.name} has nothing on the register. Pick a template and work through it on your next site walk.`
            : "Nothing is on the register yet. Pick a centre and a template to start the first assessment."}
        </EmptyState>
      ) : (
        <>
          <Suspense fallback={null}>
            <RegisterTable rows={rows} showCentre={session.centreId === null} />
          </Suspense>

          <div className="border-t border-rule bg-surface-raised px-4 py-3 sm:px-6">
            <BandKey />
          </div>
        </>
      )}

      {selectedId ? (
        <Suspense fallback={null}>
          <DetailSheet id={selectedId} />
        </Suspense>
      ) : null}
    </>
  );
}

async function DetailSheet({ id }: { id: string }) {
  const detail = await getAssessment(id);

  if (!detail) {
    return (
      <AssessmentSheet title="Not found" reference="—">
        <p className="text-ui text-muted">
          That assessment no longer exists. It may have been deleted while this
          list was open — reload to see the current register.
        </p>
      </AssessmentSheet>
    );
  }

  return (
    <AssessmentSheet
      title={detail.assessment.title}
      reference={detail.assessment.reference}
    >
      <AssessmentDocument detail={detail} />
    </AssessmentSheet>
  );
}
