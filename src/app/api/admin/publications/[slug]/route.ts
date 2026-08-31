import { NextResponse } from "next/server";
import { z } from "zod";
import { deletePublication, updatePublicationTitle } from "@/lib/fotgs-store";
import { unauthorizedIfNotAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const titleSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  const { slug } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = titleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a dashboard title." }, { status: 400 });
  }

  try {
    const updated = await updatePublicationTitle(slug, parsed.data.title);
    if (!updated) return NextResponse.json({ error: "Publication not found." }, { status: 404 });
    return NextResponse.json({ ok: true, slug, title: parsed.data.title });
  } catch {
    return NextResponse.json({ error: "Could not update the dashboard title." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const deny = await unauthorizedIfNotAdmin();
  if (deny) return deny;

  const { slug } = await params;
  try {
    const result = await deletePublication(slug);
    if (!result.deleted) return NextResponse.json({ error: "Publication not found." }, { status: 404 });
    return NextResponse.json({ ok: true, slug, replacementSlug: result.replacementSlug });
  } catch {
    return NextResponse.json({ error: "Could not delete the dashboard." }, { status: 500 });
  }
}
