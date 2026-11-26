import { NextResponse } from "next/server";
import { getFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// GET /photos.json: every photo on the wall as public JSON (see lib/feed.ts).
export async function GET(request: Request) {
  const body = await getFeed(new URL(request.url).origin);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, s-maxage=60",
    },
  });
}
