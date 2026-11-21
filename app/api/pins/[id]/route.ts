import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewer";
import { deletePin, PinError, updatePin } from "@/lib/pins";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/pins/:id: owner edits title, description, category.
export async function PATCH(request: Request, { params }: Ctx) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ pin: await updatePin(viewer, (await params).id, body) });
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/pins/:id: owner, or an admin listed in ADMIN_EMAILS.
export async function DELETE(_request: Request, { params }: Ctx) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    return NextResponse.json(await deletePin(viewer, (await params).id));
  } catch (e) {
    return fail(e);
  }
}

function fail(e: unknown) {
  if (e instanceof PinError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
