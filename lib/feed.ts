import { listPins } from "./pins";
import { withSocial } from "./social";
import { hasDatabase } from "./db";
import { SAMPLE_PINS } from "./samples";
import type { Pin } from "./shared";

export type FeedPhoto = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image: string;
  width: number | null;
  height: number | null;
  source: "member" | "ai-generated" | "stock";
  author: { name: string; avatar: string | null; bio: string | null };
  likes: number;
  createdAt: string | null;
};

export type Feed = { count: number; database: boolean; generatedAt: string; photos: FeedPhoto[] };

/**
 * Every photo on the wall (member pins newest first, then samples) as public data.
 * Viewer-specific fields and user hashes are left out so the output is the same for everyone.
 * Used by /photos.json and the /photos page.
 */
export async function getFeed(origin: string): Promise<Feed> {
  let pins: Pin[] = SAMPLE_PINS;
  let database = hasDatabase();
  try {
    pins = await withSocial([...(await listPins(null)), ...SAMPLE_PINS], null);
  } catch (e) {
    console.error("feed: could not load pins from the database", e);
    database = false;
  }
  const abs = (src: string) => new URL(src, origin).href;
  const photos = pins.map((p): FeedPhoto => ({
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    category: p.category,
    image: abs(p.src),
    width: p.width ?? null,
    height: p.height ?? null,
    source: p.sample ? (p.stock ? "stock" : "ai-generated") : "member",
    author: { name: p.author.name, avatar: p.author.avatar ? abs(p.author.avatar) : null, bio: p.author.bio ?? null },
    likes: p.likes ?? 0,
    createdAt: p.createdAt ?? null,
  }));
  return { count: photos.length, database, generatedAt: new Date().toISOString(), photos };
}
