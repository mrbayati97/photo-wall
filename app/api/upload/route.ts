import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { getViewer } from "@/lib/viewer";
import { hasDatabase } from "@/lib/db";
import { blobMode } from "@/lib/blob-mode";
import { ALLOWED_TYPES, MAX_BYTES } from "@/lib/shared";

async function authorize(pathname: string) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Sign in to upload photos.");
  if (!hasDatabase()) throw new Error("The database isn't connected yet.");
  if (!pathname.startsWith(`photos/${viewer.uid}/`)) throw new Error("Invalid upload path.");
}

// Lets signed-in users upload an image straight to Vercel Blob; the pin itself
// is saved afterwards with POST /api/pins. Supports both Blob auth styles.
export async function POST(request: Request) {
  const mode = blobMode();
  try {
    if (mode === "none") throw new Error("Image storage isn't connected yet.");
    const body = await request.json();

    if (mode === "token") {
      const result = await handleUpload({
        body: body as HandleUploadBody,
        request,
        onBeforeGenerateToken: async (pathname) => {
          await authorize(pathname);
          return { allowedContentTypes: ALLOWED_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
        },
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(result);
    }

    const result = await handleUploadPresigned({
      body: body as HandleUploadPresignedBody,
      request,
      getSignedToken: async (pathname) => {
        await authorize(pathname);
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          validUntil: Date.now() + 10 * 60 * 1000,
        });
        return { token, urlOptions: { addRandomSuffix: true } };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
