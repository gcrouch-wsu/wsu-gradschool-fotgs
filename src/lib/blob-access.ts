export type BlobAccessMode = "private" | "public";

export function getBlobAccessMode(): BlobAccessMode {
  const raw = process.env.FOTGS_BLOB_ACCESS?.trim().toLowerCase();
  return raw === "public" ? "public" : "private";
}
