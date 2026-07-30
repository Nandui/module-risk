import { notFound } from "next/navigation";
import { getAssessment } from "@/lib/data/assessments";
import { requireSession } from "@/lib/data/session";
import { AssessmentDocument } from "@/components/assessment/assessment-document";
import { BandKey } from "@/components/risk/tile-chip";

/**
 * The assessment as it appears in the PDF. Renders the same document
 * component as the screen, in print variant — so the artefact an inspector
 * reads cannot drift from the product.
 */
export default async function PrintAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const detail = await getAssessment(id);
  if (!detail) notFound();

  return (
    <div className="px-0 py-0">
      <div className="mb-6 flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
        <p className="eyebrow !text-ink">Risk assessment</p>
        <p className="font-mono text-data-xs text-muted">
          {detail.assessment.reference}
        </p>
      </div>

      <AssessmentDocument detail={detail} variant="print" />

      <div className="mt-6 border-t border-rule pt-3">
        <BandKey />
      </div>
    </div>
  );
}
