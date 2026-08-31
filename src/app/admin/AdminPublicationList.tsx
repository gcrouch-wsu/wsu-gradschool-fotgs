"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Radio } from "lucide-react";
import type { FotgsPublicationSummary } from "@/lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminPublicationList({
  currentSlug,
  publications,
}: {
  currentSlug: string | null;
  publications: FotgsPublicationSummary[];
}) {
  const router = useRouter();

  async function makeCurrent(slug: string) {
    const res = await fetch(`/api/admin/publications/${slug}/current`, { method: "POST" });
    if (res.ok) router.refresh();
  }

  if (publications.length === 0) return null;

  return (
    <section className="rounded-lg border border-wsu-gray/15 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-wsu-gray-dark">Publications</h2>
      <div className="mt-4 overflow-x-auto rounded-md border border-wsu-gray/15">
        <table className="min-w-full divide-y divide-wsu-gray/15 text-left text-sm">
          <thead className="bg-wsu-cream/80 text-xs font-semibold uppercase text-wsu-gray-dark">
            <tr>
              <th className="whitespace-nowrap px-3 py-2.5">Status</th>
              <th className="whitespace-nowrap px-3 py-2.5">Updated</th>
              <th className="whitespace-nowrap px-3 py-2.5">Rows</th>
              <th className="whitespace-nowrap px-3 py-2.5">Run date</th>
              <th className="whitespace-nowrap px-3 py-2.5">Data checks</th>
              <th className="whitespace-nowrap px-3 py-2.5">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wsu-gray/10 bg-white">
            {publications.map((pub) => {
              const current = pub.slug === currentSlug;
              return (
                <tr key={pub.slug} className="align-top">
                  <td className="whitespace-nowrap px-3 py-3">
                    {current ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-fotgs-green-soft px-2 py-1 text-xs font-semibold text-fotgs-green">
                        <CheckCircle2 aria-hidden="true" className="size-3.5" />
                        Current
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCurrent(pub.slug)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-wsu-gray/20 bg-white px-2 py-1 text-xs font-semibold text-wsu-gray-dark hover:bg-wsu-cream"
                      >
                        <Radio aria-hidden="true" className="size-3.5" />
                        Set current
                      </button>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(pub.updated_at)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{pub.rowCount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-3">{pub.runDates.join(", ") || "Blank"}</td>
                  <td className="min-w-[18rem] px-3 py-3 text-wsu-gray">
                    Degree incomplete: {pub.workdayDegreeIncompleteCount.toLocaleString()} · Rank
                    incomplete: {pub.workdayRankIncompleteCount.toLocaleString()} · Similar names:
                    {" "}
                    {pub.duplicateNameGroupCount.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link
                      href={`/s/${pub.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-wsu-crimson hover:underline"
                    >
                      Snapshot
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
