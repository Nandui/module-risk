import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RegisterTable } from "@/components/register/register-table";
import { AssessmentDocument } from "@/components/assessment/assessment-document";
import { ActionsList } from "@/components/actions/actions-list";
import { groupByOwner } from "@/lib/data/actions";
import { BandKey } from "@/components/risk/tile-chip";
import {
  PREVIEW_ACTIONS,
  PREVIEW_ASSESSMENT,
  PREVIEW_REGISTER,
} from "@/lib/preview-fixtures";

/**
 * The three screens on synthetic data, so density and rhythm can be judged
 * without a database. Development only.
 */
export default function ScreensPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-rule bg-surface-raised px-6 py-5">
        <p className="eyebrow">Design system</p>
        <h1 className="mt-1.5 font-display text-title font-bold text-ink">
          Screens on synthetic data
        </h1>
        <p className="mt-1 max-w-prose text-ui text-muted">
          Register, assessment document and actions list. Density is split by
          mode: the register is tight, the document has a measure.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="border-y border-rule bg-surface-raised px-6 py-2.5 font-display text-title-sm font-bold text-ink">
          Register — full-bleed, tight rows
        </h2>
        <div className="bg-surface-raised">
          <Suspense fallback={null}>
            <RegisterTable rows={PREVIEW_REGISTER} showCentre />
          </Suspense>
          <div className="border-t border-rule px-6 py-3">
            <BandKey />
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-y border-rule bg-surface-raised px-6 py-2.5 font-display text-title-sm font-bold text-ink">
          Assessment document — constrained measure
        </h2>
        <div className="bg-surface-raised px-6 py-8">
          <AssessmentDocument detail={PREVIEW_ASSESSMENT} />
        </div>
      </section>

      <section className="mt-12 pb-16">
        <h2 className="border-y border-rule bg-surface-raised px-6 py-2.5 font-display text-title-sm font-bold text-ink">
          Actions — grouped by owner
        </h2>
        <div className="bg-surface-raised">
          <ActionsList
            groups={groupByOwner(PREVIEW_ACTIONS)}
            currentUserId="owner-Marcus Yeo"
          />
        </div>
      </section>
    </div>
  );
}
