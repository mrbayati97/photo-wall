import { createHash } from "node:crypto";

/** Stable, non-reversible id for a user, so emails never appear in URLs or the database. */
export function userKey(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 20);
}
