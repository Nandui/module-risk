import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/data/session";

export const runtime = "nodejs";

/**
 * Authorises client-side photo uploads to the private evidence Blob store.
 *
 * The browser uploads straight to Blob rather than through a Server Action:
 * a 10 MB phone photo exceeds the Server Action body limit, and there is no
 * reason for it to travel through a serverless function. This route only
 * issues a constrained, short-lived token.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession();
        if (!session) throw new Error("Sign in before uploading evidence.");

        // The path is `<centreId>/<assessmentId>/<file>`; refuse a token for
        // a centre this person cannot write to, so the token can never be
        // used to attach evidence to another site's assessment.
        const centreId = pathname.split("/")[0];
        const allowed =
          session.profile.role === "hs_lead" ||
          session.centres.some((c) => c.id === centreId);
        if (!allowed) throw new Error("You cannot add evidence for that centre.");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          // A phone photo taken on a site walk, not a raw file.
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      // The client receives the URL directly from upload(); no webhook needed.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
