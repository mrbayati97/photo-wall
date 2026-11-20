import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { userKey } from "@/lib/photos";

// Deletes one of the signed-in user's own photos.
export async function DELETE(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  let parsed: URL;
  try {
    parsed = new URL(url ?? "");
  } catch {
    return NextResponse.json({ error: "Missing photo URL." }, { status: 400 });
  }

  const ownPrefix = `/photos/${userKey(email)}/`;
  if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com") || !parsed.pathname.startsWith(ownPrefix)) {
    return NextResponse.json({ error: "You can only delete your own photos." }, { status: 403 });
  }

  await del(parsed.toString());
  return NextResponse.json({ deleted: true });
}
