import { createHmac } from "crypto";
import { readSheet } from "read-excel-file/node";
import { sanitizePublicHref } from "./safe-url";
import { repairMissingXlsxCellReferences } from "./xlsx-compat";
import type {
  FotgsFacultyRecordInternal,
  FotgsImportSummary,
  FotgsPublicationData,
} from "./types";

export const REQUIRED_FOTGS_COLUMNS = [
  "Updated on",
  "EMPLID",
  "Last Name",
  "First Name",
  "Preferred Name",
  "Highest Degree",
  "Rank",
  "Track and Status",
  "Faculty of the Graduate School Status",
  "Appointment Status",
  "Research Webpage",
] as const;

const WORKDAY_INCOMPLETE = "Workday Data Incomplete";

function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "object") {
    const candidate = v as {
      text?: unknown;
      result?: unknown;
      richText?: { text?: unknown }[];
    };
    if (candidate.text != null) return cellToString(candidate.text);
    if (candidate.result != null) return cellToString(candidate.result);
    if (Array.isArray(candidate.richText)) {
      return candidate.richText.map((part) => cellToString(part.text)).join("").trim();
    }
  }
  return String(v).trim();
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "") || rows.length === 0) {
    rows.push(row);
  }
  return rows;
}

function rowsFromMatrix(matrix: string[][]): Record<string, string>[] {
  const headers = matrix[0]?.map((value) => value.trim().replace(/^\uFEFF/, "")) ?? [];
  const rows: Record<string, string>[] = [];

  for (const rawRow of matrix.slice(1)) {
    if (!rawRow.some((value) => value.trim() !== "")) continue;
    const out: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      out[key] = cellToString(rawRow[i] ?? "");
    }
    rows.push(out);
  }

  return rows;
}

function csvRows(buffer: Buffer): Record<string, string>[] {
  const text = new TextDecoder("utf-8").decode(buffer);
  return rowsFromMatrix(parseCsvRows(text));
}

async function firstSheetRows(
  buffer: Buffer,
  sourceFileName: string
): Promise<Record<string, string>[]> {
  if (/\.csv$/i.test(sourceFileName)) return csvRows(buffer);
  if (/\.xls$/i.test(sourceFileName) && !/\.xlsx$/i.test(sourceFileName)) {
    throw new Error("Legacy .xls files are not supported. Export from OBIEE as .csv or .xlsx.");
  }

  const matrix = await readSheet(repairMissingXlsxCellReferences(buffer), 1);
  return rowsFromMatrix(matrix.map((row) => row.map(cellToString)));
}

function canonicalHeaderMap(row: Record<string, string>): Map<string, string> {
  return new Map(Object.keys(row).map((key) => [key.trim().toLowerCase(), key]));
}

function readRequired(
  row: Record<string, string>,
  headerMap: Map<string, string>,
  key: (typeof REQUIRED_FOTGS_COLUMNS)[number]
): string {
  const actual = headerMap.get(key.toLowerCase());
  return actual ? row[actual] ?? "" : "";
}

function increment(map: Record<string, number>, raw: string): void {
  const key = raw.trim() || "Blank";
  map[key] = (map[key] ?? 0) + 1;
}

function personKeyFromEmplid(emplid: string, identitySecret: string): string {
  const secret = identitySecret.trim();
  if (secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to 16+ characters before uploading.");
  }
  return createHmac("sha256", secret).update(emplid.trim()).digest("hex");
}

function displayName(firstName: string, lastName: string, preferredName: string): string {
  const preferred = preferredName.trim();
  if (preferred) return preferred;
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || "Unnamed faculty";
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((x) => x.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function duplicateNameGroups(records: FotgsFacultyRecordInternal[]) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const r of records) {
    const key = `${r.lastName.trim().toLowerCase()}|${r.firstName.trim().toLowerCase()}`;
    if (key === "|") continue;
    const label = [r.lastName, r.firstName].filter(Boolean).join(", ");
    const prev = counts.get(key);
    counts.set(key, { label, count: (prev?.count ?? 0) + 1 });
  }
  return [...counts.values()]
    .filter((x) => x.count > 1)
    .map((x) => ({ name: x.label, count: x.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function parseFotgsWorkbook(
  buffer: Buffer,
  sourceFileName: string,
  options: { identitySecret: string }
): Promise<FotgsPublicationData> {
  const rows = await firstSheetRows(buffer, sourceFileName);
  const first = rows[0] ?? {};
  const headerMap = canonicalHeaderMap(first);
  const missingRequiredColumns = REQUIRED_FOTGS_COLUMNS.filter(
    (col) => !headerMap.has(col.toLowerCase())
  );
  if (missingRequiredColumns.length > 0) {
    throw new Error(`Missing required column(s): ${missingRequiredColumns.join(", ")}`);
  }

  const records: FotgsFacultyRecordInternal[] = [];
  const seenEmplids = new Set<string>();
  const duplicateEmplids = new Set<string>();
  let rowsMissingEmplid = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? {};
    const map = canonicalHeaderMap(row);
    const emplid = readRequired(row, map, "EMPLID").trim();
    if (!emplid) rowsMissingEmplid += 1;
    if (emplid) {
      if (seenEmplids.has(emplid)) duplicateEmplids.add(emplid);
      seenEmplids.add(emplid);
    }

    const lastName = readRequired(row, map, "Last Name");
    const firstName = readRequired(row, map, "First Name");
    const preferredName = readRequired(row, map, "Preferred Name");
    const highestDegree = readRequired(row, map, "Highest Degree");
    const rank = readRequired(row, map, "Rank");
    const trackAndStatus = readRequired(row, map, "Track and Status");
    const fotgsStatus = readRequired(row, map, "Faculty of the Graduate School Status");
    const appointmentStatus = readRequired(row, map, "Appointment Status");
    const researchWebpage = sanitizePublicHref(readRequired(row, map, "Research Webpage"));
    const updatedOn = readRequired(row, map, "Updated on");

    records.push({
      personKey: personKeyFromEmplid(
        emplid || `missing-emplid-row-${i + 2}-${lastName}-${firstName}`,
        options.identitySecret
      ),
      updatedOn,
      lastName,
      firstName,
      preferredName,
      displayName: displayName(firstName, lastName, preferredName),
      highestDegree,
      rank,
      trackAndStatus,
      fotgsStatus,
      appointmentStatus,
      researchWebpage,
      workdayDegreeIncomplete: highestDegree.trim().toLowerCase() === WORKDAY_INCOMPLETE.toLowerCase(),
      workdayRankIncomplete: rank.trim().toLowerCase() === WORKDAY_INCOMPLETE.toLowerCase(),
    });
  }

  records.sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
    if (byLast !== 0) return byLast;
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
  });

  const appointmentStatusCounts: Record<string, number> = {};
  const fotgsStatusCounts: Record<string, number> = {};
  const trackAndStatusCounts: Record<string, number> = {};
  const degreeCounts: Record<string, number> = {};
  const rankCounts: Record<string, number> = {};

  for (const r of records) {
    increment(appointmentStatusCounts, r.appointmentStatus);
    increment(fotgsStatusCounts, r.fotgsStatus);
    increment(trackAndStatusCounts, r.trackAndStatus);
    increment(degreeCounts, r.highestDegree);
    increment(rankCounts, r.rank);
  }

  const summary: FotgsImportSummary = {
    totalRows: rows.length,
    validRows: records.length,
    sourceColumns: Object.keys(first),
    requiredColumns: [...REQUIRED_FOTGS_COLUMNS],
    missingRequiredColumns,
    rowsMissingEmplid,
    duplicateEmplidCount: duplicateEmplids.size,
    duplicateNameGroups: duplicateNameGroups(records),
    runDates: uniqueSorted(records.map((r) => r.updatedOn)),
    appointmentStatusCounts,
    fotgsStatusCounts,
    trackAndStatusCounts,
    degreeCounts,
    rankCounts,
    workdayDegreeIncompleteCount: records.filter((r) => r.workdayDegreeIncomplete).length,
    workdayRankIncompleteCount: records.filter((r) => r.workdayRankIncomplete).length,
    researchWebpageCount: records.filter((r) => Boolean(r.researchWebpage)).length,
  };

  return {
    sourceFileName,
    records,
    summary,
  };
}
