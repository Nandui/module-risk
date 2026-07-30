import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/data/session";
import { renderPdf } from "@/lib/pdf";
import { format } from "date-fns";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const scope = session.centre ? session.centre.name : "All centres";

  try {
    const pdf = await renderPdf({
      path: "/print/report",
      cookie: request.headers.get("cookie") ?? "",
      origin: request.nextUrl.origin,
      footerLeft: `Risk report · ${scope} · ${format(new Date(), "dd MMM yyyy")}`,
    });

    const slug = session.centre?.code ?? "group";
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="risk-report-${slug}-${format(new Date(), "yyyy-MM-dd")}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Report PDF generation failed", error);
    return NextResponse.json(
      {
        error:
          "The report could not be generated. Try again, and if it keeps failing the print service needs looking at.",
      },
      { status: 500 },
    );
  }
}
