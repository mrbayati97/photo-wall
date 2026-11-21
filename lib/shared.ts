// Values shared by server and browser code (no Node-only imports here).
export const CATEGORIES = ["Food", "Travel", "Art", "Outdoors", "Music", "Books", "Garden", "Style"] as const;
export type Category = (typeof CATEGORIES)[number] | "Other";

export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MAX_BYTES = 20 * 1024 * 1024;

export type Pin = {
  id: string;
  src: string;
  title: string;
  description?: string;
  category: Category;
  author: { name: string; avatar: string | null; bio?: string };
  sample: boolean;
  mine: boolean;
  width?: number;
  height?: number;
};

/** Turns a pin title into a safe file name segment. */
export function slugTitle(title: string) {
  return (
    title
      .trim()
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "Untitled"
  );
}
