import Link from "next/link";
import { AdminSignOutButton } from "@/components/AdminSignOutButton";
import { getCurrentViewSlug, listPublicationSummaries } from "@/lib/fotgs-store";
import { requireAdminPage } from "@/lib/require-admin";
import { AdminPublicationList } from "./AdminPublicationList";
import { AdminUploader } from "./AdminUploader";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPage();
  const [currentSlug, publications] = await Promise.all([
    getCurrentViewSlug(),
    listPublicationSummaries(),
  ]);

  return (
    <main className="mx-auto max-w-[88rem] px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-wsu-gray-dark">Admin</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-wsu-gray">
            Upload a trusted OBIEE export and publish a sanitized faculty dashboard. EMPLID is used only
            to create a private import key and is removed from the public view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/view"
            target="_blank"
            className="rounded-md border border-wsu-gray/20 bg-white px-3 py-2 text-sm font-semibold text-wsu-gray-dark shadow-sm hover:bg-wsu-cream"
          >
            Public view
          </Link>
          <AdminSignOutButton />
        </div>
      </div>

      <div className="grid gap-5">
        <AdminUploader />
        <AdminPublicationList currentSlug={currentSlug} publications={publications} />
      </div>
    </main>
  );
}
