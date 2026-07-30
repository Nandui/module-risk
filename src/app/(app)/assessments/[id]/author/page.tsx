import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { canSignOff, requireSession } from "@/lib/data/session";
import { getAssessment, listPeople } from "@/lib/data/assessments";
import { listControlMeasures, listHazards, listTemplates } from "@/lib/data/library";
import { AuthoringFlow } from "@/components/authoring/authoring-flow";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Authoring" };

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);

  const [detail, hazards, controls, templates, people] = await Promise.all([
    getAssessment(id),
    listHazards(),
    listControlMeasures(),
    listTemplates(),
    listPeople(),
  ]);

  if (!detail) notFound();

  const template = detail.assessment.templateId
    ? templates.find((t) => t.id === detail.assessment.templateId)
    : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule bg-surface-raised px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="eyebrow">
            {detail.centre?.name ?? "Unknown centre"}
            <span className="ml-2 font-mono normal-case tracking-normal text-faint">
              {detail.assessment.reference}
            </span>
          </p>
          <h1 className="mt-1 font-display text-title-sm font-bold text-ink">
            {detail.assessment.title}
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/register?a=${detail.assessment.id}`}>
            <ArrowLeft aria-hidden />
            Back to register
          </Link>
        </Button>
      </div>

      <AuthoringFlow
        detail={detail}
        hazards={hazards}
        controls={controls}
        people={people}
        templateHazardIds={template?.hazardIds ?? []}
        canSignOff={canSignOff(session.profile)}
      />
    </>
  );
}
