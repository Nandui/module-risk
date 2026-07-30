import type { Metadata } from "next";
import { requireSession, isHsLead } from "@/lib/data/session";
import {
  listControlMeasures,
  listHazards,
  listTemplates,
} from "@/lib/data/library";
import { PageHeader } from "@/components/shell/page-header";
import { LibraryBrowser } from "@/components/library/library-browser";

export const metadata: Metadata = { title: "Library" };

/**
 * The controlled vocabulary, and the queue of additions waiting on the H&S
 * lead. Making the library visible is what stops it rotting.
 */
export default async function LibraryPage() {
  const [session, hazards, controls, templates] = await Promise.all([
    requireSession(),
    listHazards(),
    listControlMeasures(),
    listTemplates(),
  ]);

  const pending =
    hazards.filter((h) => h.review_state === "pending_review").length +
    controls.filter((c) => c.review_state === "pending_review").length;

  return (
    <>
      <PageHeader
        eyebrow="Controlled vocabulary"
        title="Library"
        description={
          pending > 0
            ? `${hazards.length} hazards and ${controls.length} controls. ${pending} awaiting review.`
            : `${hazards.length} hazards and ${controls.length} controls, shared by every centre.`
        }
      />
      <LibraryBrowser
        hazards={hazards}
        controls={controls}
        templates={templates}
        canReview={isHsLead(session.profile)}
      />
    </>
  );
}
