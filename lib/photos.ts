import { createHash } from "node:crypto";
import { list } from "@vercel/blob";

export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MAX_BYTES = 20 * 1024 * 1024;

/** Stable, non-reversible id for a user, so emails never appear in public URLs. */
export function userKey(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 20);
}

export type Profile = { name: string; image: string | null };
export type Photo = {
  url: string;
  pathname: string;
  owner: string;
  uploadedAt: string;
  profile: Profile | null;
};

/** Every uploaded photo, newest first, with the uploader's name and avatar. */
export async function listPhotos(): Promise<Photo[]> {
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
        /* a missing profile just shows as "Someone" */
      }
    }),
  );

  return photos.blobs
    .map((b) => {
      const owner = b.pathname.split("/")[1] ?? "";
      return {
        url: b.url,
        pathname: b.pathname,
        owner,
        uploadedAt: new Date(b.uploadedAt).toISOString(),
        profile: profiles.get(owner) ?? null,
      };
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
