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
  author: { key: string; name: string; avatar: string | null; bio?: string };
  likes?: number;
  liked?: boolean;
  followers?: number;
  following?: boolean;
  sample: boolean;
  mine: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createdAt?: string;
  aiGenerated?: boolean;
  stock?: boolean;
  width?: number;
  height?: number;
};

export const LIMITS = { title: 80, description: 500 };
