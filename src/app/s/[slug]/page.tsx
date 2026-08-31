import { notFound } from "next/navigation";
import { FotgsDashboard } from "@/components/FotgsDashboard";
import { getPublicationBySlug, toPublicPayload } from "@/lib/fotgs-store";

export const dynamic = "force-dynamic";

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
