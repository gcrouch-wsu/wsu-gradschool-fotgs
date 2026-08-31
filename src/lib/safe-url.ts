const INVALID_PLACEHOLDERS = new Set([
  "n/a",
  "na",
  "none",
  "tbd",
  "null",
  "undefined",
  "-",
  "--",
  "no",
  "not applicable",
  "nil",
  "blank",
]);

export function sanitizePublicHref(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  if (INVALID_PLACEHOLDERS.has(value.toLowerCase())) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Ensure hostname looks like a valid domain or localhost
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

