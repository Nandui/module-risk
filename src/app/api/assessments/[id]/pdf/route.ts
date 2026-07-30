import { NextResponse, type NextRequest } from "next/server";
import { getAssessment } from "@/lib/data/assessments";
import { requireSession } from "@/lib/data/session";
import { renderPdf } from "@/lib/pdf";

// Chromium needs the Node runtime and more than the default budget.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;

  const detail = await getAssessment(id);
  if (!detail) {
    return NextResponse.json({ error: "That assessment could not be found." }, { status: 404 });
  }

  try {
    const pdf = await renderPdf({
      path: `/print/assessments/${id}`,
      cookie: request.headers.get("cookie") ?? "",
      origin: request.nextUrl.origin,
      footerLeft: `${detail.assessment.reference} · ${detail.centre?.name ?? ""}`,
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        // `inline` so it opens in the browser's viewer — an inspector reading
        // over someone's shoulder should not have to find a download.
        "content-disposition": `inline; filename="${detail.assessment.reference}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed", error);
    return NextResponse.json(
      {
        error:
          "The PDF could not be generated. The assessment itself is unaffected — try again, and if it keeps failing the print service needs looking at.",
      },
      { status: 500 },
    );
  }
}
