import type { Metadata } from "next";
import Link from "next/link";
import { FotgsDashboard } from "@/components/FotgsDashboard";
import type { DashboardSearchParams } from "@/lib/dashboard-ui";
import { getCurrentViewPublication, toPublicPayload } from "@/lib/fotgs-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Current Faculty Roster",
  description: "Washington State University Faculty of the Graduate School appointment dashboard.",
};

export default async function CurrentViewPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const [publication, initialSearchParams] = await Promise.all([
    getCurrentViewPublication(),
    searchParams,
  ]);

  if (!publication) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h1 className="text-xl font-semibold">
            No Faculty of the Graduate School dashboard is published yet
          </h1>
          <p className="mt-2 text-sm leading-relaxed">
            Sign in to admin and upload the first OBIEE export.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-flex rounded-md bg-wsu-crimson px-4 py-2 text-sm font-semibold text-white hover:bg-wsu-crimson-dark"
          >
            Admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <FotgsDashboard
      publication={toPublicPayload(publication)}
      initialSearchParams={initialSearchParams}
    />
  );
}
