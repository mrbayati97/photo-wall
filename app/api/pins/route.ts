import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewer";
import { createPin, listPins, PinError } from "@/lib/pins";
import { hasDatabase } from "@/lib/db";

// GET /api/pins: every pin, newest first (public).
export async function GET() {
  try {
    return NextResponse.json({ pins: await listPins(await getViewer()) });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/pins: save a pin after its image is uploaded to Blob.
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to post pins." }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "The database isn't connected yet." }, { status: 503 });
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ pin: await createPin(viewer, body) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

function fail(e: unknown) {
  if (e instanceof PinError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
