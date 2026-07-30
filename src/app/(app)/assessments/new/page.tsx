import type { Metadata } from "next";
import { requireSession } from "@/lib/data/session";
import { listTemplates } from "@/lib/data/library";
import { PageHeader } from "@/components/shell/page-header";
import { NewAssessmentForm } from "@/components/authoring/new-assessment-form";

export const metadata: Metadata = { title: "New assessment" };

/**
 * Step one of the Create job: pick a centre and a template. Everything else
 * happens on the walk.
 */
export default async function NewAssessmentPage() {
  const [session, templates] = await Promise.all([requireSession(), listTemplates()]);

  return (
    <>
      <PageHeader
        eyebrow="New assessment"
        title="What are you assessing?"
        description="Pick the centre and the kind of space. The template decides which hazards you are walked through."
      />
      <div className="px-4 py-8 sm:px-8">
        <NewAssessmentForm
          centres={session.centres}
          templates={templates}
          defaultCentreId={session.centreId}
        />
      </div>
    </>
  );
}
