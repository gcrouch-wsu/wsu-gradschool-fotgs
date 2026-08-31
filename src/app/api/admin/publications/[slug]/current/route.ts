import { NextResponse } from "next/server";
import { setCurrentViewPublication } from "@/lib/fotgs-store";
import { unauthorizedIfNotAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  const { slug } = await params;
  const updated = await setCurrentViewPublication(slug);
  if (!updated) {
    return NextResponse.json({ error: "Publication not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, slug });
}
