import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FotgsDashboard } from "@/components/FotgsDashboard";
import { formatPublicTitle, type DashboardSearchParams } from "@/lib/dashboard-ui";
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
    title: `${formatPublicTitle(publication.title)} (Snapshot ${slug})`,
    description: `Faculty of the Graduate School appointment snapshot published on ${new Date(publication.updated_at).toLocaleDateString()}`,
  };
}

export default async function SnapshotPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DashboardSearchParams>;
}) {
  const [{ slug }, initialSearchParams] = await Promise.all([params, searchParams]);
  const publication = await getPublicationBySlug(slug);
  if (!publication) notFound();
  return (
    <FotgsDashboard
      publication={toPublicPayload(publication)}
      initialSearchParams={initialSearchParams}
    />
  );
}
