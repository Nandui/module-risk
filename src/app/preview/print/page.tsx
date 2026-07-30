import { notFound } from "next/navigation";
import { AssessmentDocument } from "@/components/assessment/assessment-document";
import { BandKey } from "@/components/risk/tile-chip";
import { PREVIEW_ASSESSMENT } from "@/lib/preview-fixtures";
import { formatDateTime } from "@/lib/utils";

/**
 * The print variant of the assessment document, on synthetic data, so the PDF
 * pipeline can be exercised and the output read without a database.
 * Development only.
 */
export default function PrintPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="bg-white px-10 py-8 text-ink">
      <div className="mb-6 flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
        <p className="eyebrow !text-ink">Risk assessment</p>
        <p className="font-mono text-data-xs text-muted">
          {PREVIEW_ASSESSMENT.assessment.reference}
        </p>
      </div>

      <AssessmentDocument detail={PREVIEW_ASSESSMENT} variant="print" />

      <div className="mt-6 border-t border-rule pt-3">
        <BandKey />
        <p className="mt-2 font-mono text-data-xs text-muted">
          Preview rendered {formatDateTime(new Date())}
        </p>
      </div>
    </div>
  );
}
