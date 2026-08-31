import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FotgsDashboard } from "@/components/FotgsDashboard";
import { getPublicationBySlug, toPublicPayload } from "@/lib/fotgs-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const publication = await getPublicationBySlug(slug);
  if (!publication) {
    return { title: "Publication Not Found" };
  }
  return {
    title: `${publication.title} (Snapshot ${slug})`,
    description: `FOTGS faculty appointment snapshot published on ${new Date(publication.updated_at).toLocaleDateString()}`,
  };
}

export default async function SnapshotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publication = await getPublicationBySlug(slug);
  if (!publication) notFound();
  return <FotgsDashboard publication={toPublicPayload(publication)} />;
}
