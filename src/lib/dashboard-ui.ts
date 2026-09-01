const DASHBOARD_TIME_ZONE = "America/Los_Angeles";

export type DashboardSearchParams = Record<string, string | string[] | undefined>;

export function formatPublicTitle(raw: string): string {
  const title = raw
    .replace(/\s*\(\s*FOTGS\s*\)/gi, "")
    .replace(/\bFOTGS\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return (
    title.replace(
      /Faculty Of The Graduate School/gi,
      "Faculty of the Graduate School"
    ) || "Faculty of the Graduate School"
  );
}

export function formatDashboardDate(
  raw: string | null | undefined,
  includeTime = false
): string {
  if (!raw) return "Blank";
  const trimmed = String(raw).trim();
  if (!trimmed) return "Blank";

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Date.UTC(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3])
        )
      )
    : new Date(trimmed);

  if (Number.isNaN(date.getTime())) return trimmed;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime && !dateOnlyMatch
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" as const }
      : {}),
    timeZone: dateOnlyMatch ? "UTC" : DASHBOARD_TIME_ZONE,
  }).format(date);
}
