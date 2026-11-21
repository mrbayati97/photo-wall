import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewer";
import { hasDatabase } from "@/lib/db";
import { PinError } from "@/lib/pins";
import { setFollow } from "@/lib/social";

// POST /api/follows { target, on }: follow (on=true) or unfollow a person.
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to follow people." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "The database isn't connected yet." }, { status: 503 });
  try {
    const { target, on } = (await request.json().catch(() => ({}))) as { target?: string; on?: boolean };
    return NextResponse.json(await setFollow(viewer, String(target ?? ""), on !== false));
  } catch (e) {
    if (e instanceof PinError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
