import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getViewer } from "@/lib/viewer";
import { hasDatabase } from "@/lib/db";
import { ALLOWED_TYPES, MAX_BYTES } from "@/lib/shared";

// Issues short-lived upload tokens to signed-in users. The browser uploads
// the image straight to Vercel Blob, then saves the pin via POST /api/pins.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const viewer = await getViewer();
        if (!viewer) throw new Error("Sign in to upload photos.");
        if (!hasDatabase()) throw new Error("The database isn't connected yet.");
        if (!pathname.startsWith(`photos/${viewer.uid}/`)) throw new Error("Invalid upload path.");
        return { allowedContentTypes: ALLOWED_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
