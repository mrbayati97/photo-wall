import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewer";
import { hasDatabase } from "@/lib/db";
import { PinError } from "@/lib/pins";
import { setLike } from "@/lib/social";

// POST /api/likes { pinId, on }: like (on=true) or unlike a pin.
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to like pins." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "The database isn't connected yet." }, { status: 503 });
  try {
    const { pinId, on } = (await request.json().catch(() => ({}))) as { pinId?: string; on?: boolean };
    return NextResponse.json(await setLike(viewer, String(pinId ?? ""), on !== false));
  } catch (e) {
    if (e instanceof PinError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
