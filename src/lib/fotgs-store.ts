import { del, get, list, put } from "@vercel/blob";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import path from "path";
import { getBlobAccessMode } from "./blob-access";
import type {
  FotgsFacultyRecordPublic,
  FotgsPublicationRow,
  FotgsPublicationSummary,
  PublicFotgsPublication,
  StoredFotgsPublication,
} from "./types";

const BLOB_PREFIX = "fotgs-publications";
const CURRENT_VIEW_PATHNAME = `${BLOB_PREFIX}/_current-view.json`;
const LOCAL_STORE_DIR = path.join(process.cwd(), ".fotgs-local-store");

type CurrentViewBlob = {
  slug: string;
  updated_at: string;
};

export class FotgsStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FotgsStorageError";
  }
}

function canUseLocalStore(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.BLOB_READ_WRITE_TOKEN?.trim();
}

function blobAuthOptions(): { token?: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token ? { token } : {};
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9]{8,32}$/.test(slug);
}

function publicationPathname(slug: string): string {
  if (!validateSlug(slug)) throw new Error("Invalid slug");
  return `${BLOB_PREFIX}/${slug}.json`;
}

function localPublicationPath(slug: string): string {
  return path.join(LOCAL_STORE_DIR, `${slug}.json`);
}

function localCurrentPath(): string {
  return path.join(LOCAL_STORE_DIR, "_current-view.json");
}

async function persistLocalPublication(body: StoredFotgsPublication): Promise<void> {
  await mkdir(LOCAL_STORE_DIR, { recursive: true });
  await writeFile(localPublicationPath(body.slug), JSON.stringify(body, null, 2), "utf8");
}

async function persistLocalCurrent(slug: string): Promise<void> {
  await mkdir(LOCAL_STORE_DIR, { recursive: true });
  const body: CurrentViewBlob = { slug, updated_at: new Date().toISOString() };
  await writeFile(localCurrentPath(), JSON.stringify(body, null, 2), "utf8");
}

async function getLocalPublication(slug: string): Promise<StoredFotgsPublication | null> {
  if (!validateSlug(slug)) return null;
  try {
    const text = await readFile(localPublicationPath(slug), "utf8");
    const parsed = JSON.parse(text) as StoredFotgsPublication;
    if (parsed.version !== 1 || parsed.slug !== slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function listLocalSlugs(): Promise<string[]> {
  try {
    const names = await readdir(LOCAL_STORE_DIR);
    return names.filter((name) => /^[a-z0-9]{8,32}\.json$/.test(name)).map((n) => n.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

async function persistBlobPublication(body: StoredFotgsPublication): Promise<void> {
  await put(publicationPathname(body.slug), JSON.stringify(body), {
    access: getBlobAccessMode(),
    ...blobAuthOptions(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function persistBlobCurrent(slug: string): Promise<void> {
  const body: CurrentViewBlob = { slug, updated_at: new Date().toISOString() };
  await put(CURRENT_VIEW_PATHNAME, JSON.stringify(body), {
    access: getBlobAccessMode(),
    ...blobAuthOptions(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function getStoredBlobPublication(slug: string): Promise<StoredFotgsPublication | null> {
  if (!validateSlug(slug)) return null;
  try {
    const res = await get(publicationPathname(slug), {
      access: getBlobAccessMode(),
      ...blobAuthOptions(),
      useCache: false,
    });
    if (!res?.stream) return null;
    const text = await new Response(res.stream as ReadableStream).text();
    const parsed = JSON.parse(text) as StoredFotgsPublication;
    if (parsed.version !== 1 || parsed.slug !== slug) return null;
    return parsed;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not found|404|NoSuchKey|does not exist/i.test(msg)) return null;
    throw new FotgsStorageError(
      `Failed to load Faculty of the Graduate School publication ${slug}`,
      { cause: e }
    );
  }
}

function blobToRow(parsed: StoredFotgsPublication): FotgsPublicationRow {
  return {
    id: parsed.slug,
    ...parsed,
  };
}

function toSummary(row: StoredFotgsPublication): FotgsPublicationSummary {
  const counts = row.data.summary.appointmentStatusCounts;
  return {
    slug: row.slug,
    title: row.title,
    sourceFileName: row.data.sourceFileName,
    rowCount: row.data.records.length,
    runDates: row.data.summary.runDates,
    currentCount: counts.Current ?? 0,
    endedCount: counts.Ended ?? 0,
    missingEndDateCount: counts["Missing End Date"] ?? 0,
    workdayDegreeIncompleteCount: row.data.summary.workdayDegreeIncompleteCount,
    workdayRankIncompleteCount: row.data.summary.workdayRankIncompleteCount,
    duplicateEmplidCount: row.data.summary.duplicateEmplidCount,
    duplicateNameGroupCount: row.data.summary.duplicateNameGroups.length,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function stripPrivateRecord(record: FotgsPublicationRow["data"]["records"][number]): FotgsFacultyRecordPublic {
  return {
    updatedOn: record.updatedOn,
    lastName: record.lastName,
    firstName: record.firstName,
    preferredName: record.preferredName,
    displayName: record.displayName,
    highestDegree: record.highestDegree,
    rank: record.rank,
    trackAndStatus: record.trackAndStatus,
    fotgsStatus: record.fotgsStatus,
    appointmentStatus: record.appointmentStatus,
    researchWebpage: record.researchWebpage,
    workdayDegreeIncomplete: record.workdayDegreeIncomplete,
    workdayRankIncomplete: record.workdayRankIncomplete,
  };
}

export function toPublicPayload(row: FotgsPublicationRow): PublicFotgsPublication {
  return {
    title: row.title,
    slug: row.slug,
    sourceFileName: row.data.sourceFileName,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    records: row.data.records.map(stripPrivateRecord),
    summary: {
      runDates: row.data.summary.runDates,
      appointmentStatusCounts: row.data.summary.appointmentStatusCounts,
      workdayDegreeIncompleteCount: row.data.summary.workdayDegreeIncompleteCount,
      workdayRankIncompleteCount: row.data.summary.workdayRankIncompleteCount,
      researchWebpageCount: row.data.summary.researchWebpageCount,
    },
  };
}

export async function createPublication(input: {
  slug: string;
  title: string;
  data: StoredFotgsPublication["data"];
}): Promise<void> {
  const now = new Date().toISOString();
  const body: StoredFotgsPublication = {
    version: 1,
    slug: input.slug,
    title: input.title,
    data: input.data,
    created_at: now,
    updated_at: now,
  };

  if (canUseLocalStore()) {
    await persistLocalPublication(body);
    await persistLocalCurrent(input.slug);
    return;
  }

  await persistBlobPublication(body);
  await persistBlobCurrent(input.slug);
}

export async function updatePublicationTitle(slug: string, title: string): Promise<boolean> {
  const existing = await getPublicationBySlug(slug);
  if (!existing) return false;

  const body: StoredFotgsPublication = {
    version: existing.version,
    slug: existing.slug,
    title,
    data: existing.data,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  if (canUseLocalStore()) {
    await persistLocalPublication(body);
  } else {
    await persistBlobPublication(body);
  }
  return true;
}

export async function getPublicationBySlug(slug: string): Promise<FotgsPublicationRow | null> {
  const parsed = canUseLocalStore()
    ? await getLocalPublication(slug)
    : await getStoredBlobPublication(slug);
  return parsed ? blobToRow(parsed) : null;
}

async function getLatestPublicationSlug(): Promise<string | null> {
  if (canUseLocalStore()) {
    const slugs = await listLocalSlugs();
    const rows = await Promise.all(slugs.map((slug) => getLocalPublication(slug)));
    return rows
      .filter((row): row is StoredFotgsPublication => Boolean(row))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0]?.slug ?? null;
  }

  try {
    const rows = await list({ ...blobAuthOptions(), prefix: `${BLOB_PREFIX}/`, limit: 1000 });
    const latest = rows.blobs
      .filter((blob) => {
        const name = blob.pathname.slice(`${BLOB_PREFIX}/`.length);
        return /^[a-z0-9]{8,32}\.json$/.test(name);
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
    return latest?.pathname.slice(`${BLOB_PREFIX}/`.length).replace(/\.json$/, "") ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentViewSlug(): Promise<string | null> {
  if (canUseLocalStore()) {
    try {
      const text = await readFile(localCurrentPath(), "utf8");
      const parsed = JSON.parse(text) as Partial<CurrentViewBlob>;
      return typeof parsed.slug === "string" && validateSlug(parsed.slug)
        ? parsed.slug
        : await getLatestPublicationSlug();
    } catch {
      return getLatestPublicationSlug();
    }
  }

  try {
    const res = await get(CURRENT_VIEW_PATHNAME, {
      access: getBlobAccessMode(),
      ...blobAuthOptions(),
      useCache: false,
    });
    if (!res?.stream) return getLatestPublicationSlug();
    const text = await new Response(res.stream as ReadableStream).text();
    const parsed = JSON.parse(text) as Partial<CurrentViewBlob>;
    return typeof parsed.slug === "string" && validateSlug(parsed.slug)
      ? parsed.slug
      : await getLatestPublicationSlug();
  } catch {
    return getLatestPublicationSlug();
  }
}

export async function getCurrentViewPublication(): Promise<FotgsPublicationRow | null> {
  const slug = await getCurrentViewSlug();
  if (!slug) return null;
  return getPublicationBySlug(slug);
}

export async function setCurrentViewPublication(slug: string): Promise<FotgsPublicationRow | null> {
  const existing = await getPublicationBySlug(slug);
  if (!existing) return null;

  if (canUseLocalStore()) {
    await persistLocalCurrent(slug);
    return existing;
  }

  await persistBlobCurrent(slug);
  return existing;
}

export async function deletePublication(slug: string): Promise<{
  deleted: boolean;
  replacementSlug: string | null;
}> {
  const current = await getCurrentViewSlug();

  if (canUseLocalStore()) {
    const existing = await getLocalPublication(slug);
    if (!existing) return { deleted: false, replacementSlug: null };
    await rm(localPublicationPath(slug), { force: true });
    if (current !== slug) return { deleted: true, replacementSlug: null };

    const replacementSlug = await getLatestPublicationSlug();
    if (replacementSlug) {
      await persistLocalCurrent(replacementSlug);
    } else {
      await rm(localCurrentPath(), { force: true });
    }
    return { deleted: true, replacementSlug };
  }

  const existing = await getStoredBlobPublication(slug);
  if (!existing) return { deleted: false, replacementSlug: null };
  await del(publicationPathname(slug), { ...blobAuthOptions() });
  if (current !== slug) return { deleted: true, replacementSlug: null };

  const replacementSlug = await getLatestPublicationSlug();
  if (replacementSlug) {
    await persistBlobCurrent(replacementSlug);
  } else {
    await del(CURRENT_VIEW_PATHNAME, { ...blobAuthOptions() });
  }
  return { deleted: true, replacementSlug };
}

export async function listPublicationSummaries(): Promise<FotgsPublicationSummary[]> {
  if (canUseLocalStore()) {
    const slugs = await listLocalSlugs();
    const rows = await Promise.all(slugs.map((slug) => getLocalPublication(slug)));
    return rows
      .filter((row): row is StoredFotgsPublication => Boolean(row))
      .map(toSummary)
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  let rows;
  try {
    rows = await list({ ...blobAuthOptions(), prefix: `${BLOB_PREFIX}/`, limit: 1000 });
  } catch {
    return [];
  }

  const slugs = rows.blobs
    .map((blob) => blob.pathname.slice(`${BLOB_PREFIX}/`.length))
    .filter((name) => /^[a-z0-9]{8,32}\.json$/.test(name))
    .map((name) => name.replace(/\.json$/, ""));

  const summaries = await Promise.all(
    slugs.map(async (slug) => {
      const body = await getStoredBlobPublication(slug).catch(() => null);
      return body ? toSummary(body) : null;
    })
  );

  return summaries
    .filter((row): row is FotgsPublicationSummary => Boolean(row))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}
