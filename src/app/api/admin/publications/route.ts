import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import { createPublication } from "@/lib/fotgs-store";
import { parseFotgsWorkbook } from "@/lib/parse-fotgs";
import { unauthorizedIfNotAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const mkSlug = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

function requireUploadSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to 16+ characters before uploading.");
  }
  return secret;
}

function fileExtensionOk(fileName: string): boolean {
  return /\.(csv|xlsx)$/i.test(fileName);
}

export async function POST(request: Request) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read upload form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (!fileExtensionOk(file.name)) {
    return NextResponse.json({ error: "Upload a .csv or .xlsx file." }, { status: 400 });
  }

  const titleRaw = form.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim().slice(0, 200)
      : "Faculty Of The Graduate School FOTGS";

  let data;
  try {
    data = await parseFotgsWorkbook(Buffer.from(await file.arrayBuffer()), file.name, {
      identitySecret: requireUploadSecret(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Parse failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (data.records.length === 0) {
    return NextResponse.json({ error: "No faculty rows were found in the upload." }, { status: 400 });
  }

  const slug = mkSlug();
  try {
    await createPublication({ slug, title, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Storage error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    slug,
    publicUrl: "/view",
    slugUrl: `/s/${slug}`,
    adminUrl: "/admin",
    rowCount: data.records.length,
    runDates: data.summary.runDates,
    duplicateEmplidCount: data.summary.duplicateEmplidCount,
    duplicateNameGroupCount: data.summary.duplicateNameGroups.length,
    workdayDegreeIncompleteCount: data.summary.workdayDegreeIncompleteCount,
    workdayRankIncompleteCount: data.summary.workdayRankIncompleteCount,
  });
}
