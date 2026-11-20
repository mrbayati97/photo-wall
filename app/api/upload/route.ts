import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { ALLOWED_TYPES, MAX_BYTES, userKey } from "@/lib/photos";

// Issues short-lived upload tokens to signed-in users. The browser then
// uploads the file straight to Vercel Blob (no 4.5 MB serverless body limit).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        const email = session?.user?.email;
        if (!email) throw new Error("Sign in to upload photos.");

        const uid = userKey(email);
        if (!pathname.startsWith(`photos/${uid}/`)) throw new Error("Invalid upload path.");

        // Keep the uploader's display name and avatar next to their photos.
        await put(
          `users/${uid}.json`,
          JSON.stringify({ name: session.user?.name ?? "", image: session.user?.image ?? null }),
          { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true },
        );

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
