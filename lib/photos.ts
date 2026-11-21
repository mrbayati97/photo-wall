import { createHash } from "node:crypto";
import { list } from "@vercel/blob";
import { CATEGORIES, type Category, type Pin } from "./shared";

export { ALLOWED_TYPES, MAX_BYTES } from "./shared";

/** Stable, non-reversible id for a user, so emails never appear in public URLs. */
export function userKey(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 20);
}

type Profile = { name: string; image: string | null };

function titleFromFile(file: string) {
  const base = decodeURIComponent(file).replace(/\.[a-z0-9]+$/i, "").replace(/-[A-Za-z0-9]{16,}$/, "");
  const t = base.replace(/[-_]+/g, " ").trim();
  return t && t.toLowerCase() !== "untitled" ? t : "Untitled";
}

/**
 * Every uploaded pin, newest first. Blob paths look like
 * photos/<user>/<category>/<Title-words>-<random>.<ext>; the title and
 * category come from the path, so no database is needed.
 */
export async function listUploads(myUid: string | null): Promise<Pin[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];

  const [photos, users] = await Promise.all([
    list({ prefix: "photos/", limit: 1000 }),
    list({ prefix: "users/", limit: 1000 }),
  ]);

  const profiles = new Map<string, Profile>();
  await Promise.all(
    users.blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (res.ok) profiles.set(b.pathname.slice(6, -5), (await res.json()) as Profile);
      } catch {
        /* a missing profile shows as "Someone" */
      }
    }),
  );

  return photos.blobs
    .slice()
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .map((b) => {
      const parts = b.pathname.split("/");
      const owner = parts[1] ?? "";
      const cat = parts.length >= 4 ? decodeURIComponent(parts[2]) : "";
      const category: Category = (CATEGORIES as readonly string[]).includes(cat) ? (cat as Category) : "Other";
      const profile = profiles.get(owner);
      return {
        id: b.pathname,
        src: b.url,
        title: titleFromFile(parts[parts.length - 1] ?? ""),
        category,
        author: { name: profile?.name || "Someone", avatar: profile?.image ?? null },
        sample: false,
        mine: owner === myUid,
      };
    });
}
