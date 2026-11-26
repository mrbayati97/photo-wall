import { NextResponse } from "next/server";
import { listPins } from "@/lib/pins";
import { withSocial } from "@/lib/social";
import { hasDatabase } from "@/lib/db";
import { SAMPLE_PINS } from "@/lib/samples";
import type { Pin } from "@/lib/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// GET /photos.json: every photo on the wall (member pins newest first, then samples) as public JSON.
// Viewer-specific fields (mine, liked, canEdit...) are left out so the output is the same for everyone.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  let pins: Pin[] = SAMPLE_PINS;
  let database = hasDatabase();
  try {
    pins = await withSocial([...(await listPins(null)), ...SAMPLE_PINS], null);
  } catch (e) {
    console.error("photos.json: could not load pins from the database", e);
    database = false;
  }

  const photos = pins.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    category: p.category,
    image: new URL(p.src, origin).href,
    width: p.width ?? null,
    height: p.height ?? null,
    source: p.sample ? (p.stock ? "stock" : "ai-generated") : "member",
    author: {
      name: p.author.name,
      avatar: p.author.avatar ? new URL(p.author.avatar, origin).href : null,
      bio: p.author.bio ?? null,
    },
    likes: p.likes ?? 0,
    createdAt: p.createdAt ?? null,
  }));

  const body = { count: photos.length, database, generatedAt: new Date().toISOString(), photos };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, s-maxage=60",
    },
  });
}
