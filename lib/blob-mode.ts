/**
 * How this deployment talks to Vercel Blob:
 * - "token": classic stores with BLOB_READ_WRITE_TOKEN
 * - "oidc":  newer stores with BLOB_STORE_ID (Vercel signs requests itself)
 */
export type BlobMode = "token" | "oidc" | "none";

export function blobMode(): BlobMode {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "token";
  if (process.env.BLOB_STORE_ID?.trim()) return "oidc";
  return "none";
}
