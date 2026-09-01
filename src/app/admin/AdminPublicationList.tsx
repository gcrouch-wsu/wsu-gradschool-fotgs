"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  Radio,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { formatDashboardDate } from "@/lib/dashboard-ui";
import type { FotgsPublicationSummary } from "@/lib/types";

export function AdminPublicationList({
  currentSlug,
  publications,
}: {
  currentSlug: string | null;
  publications: FotgsPublicationSummary[];
}) {
  const router = useRouter();
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEditing(slug: string, currentTitle: string) {
    setError(null);
    setEditingSlug(slug);
    setEditingTitle(currentTitle);
  }

  function cancelEditing() {
    setEditingSlug(null);
    setEditingTitle("");
  }

  async function saveTitle(slug: string) {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      setError("Enter a dashboard title.");
      return;
    }
    setPendingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/admin/publications/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setPendingSlug(null);
      if (!res.ok) {
        setError(body.error ?? "Could not update the dashboard title.");
        return;
      }
      cancelEditing();
      router.refresh();
    } catch {
      setPendingSlug(null);
      setError("Network error while updating dashboard title.");
    }
  }

  async function removePublication(slug: string, title: string) {
    if (!window.confirm(`Delete "${title || slug}"? This cannot be undone.`)) return;
    setPendingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/admin/publications/${slug}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setPendingSlug(null);
      if (!res.ok) {
        setError(body.error ?? "Could not delete the dashboard.");
        return;
      }
      if (editingSlug === slug) cancelEditing();
      router.refresh();
    } catch {
      setPendingSlug(null);
      setError("Network error while deleting publication.");
    }
  }

  async function makeCurrent(slug: string) {
    setPendingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/admin/publications/${slug}/current`, { method: "POST" });
      setPendingSlug(null);
      if (res.ok) router.refresh();
      else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not set current dashboard.");
      }
    } catch {
      setPendingSlug(null);
      setError("Network error while setting current dashboard.");
    }
  }

  if (publications.length === 0) return null;

  return (
    <section className="rounded-lg border border-wsu-gray/15 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-wsu-gray-dark">Publication History</h2>
        <span className="text-xs text-wsu-gray">
          {publications.length} {publications.length === 1 ? "dashboard" : "dashboards"}
        </span>
      </div>

      {error ? (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-wsu-gray/15">
        <table className="min-w-full divide-y divide-wsu-gray/15 text-left text-sm">
          <thead className="bg-wsu-cream/80 text-xs font-semibold uppercase text-wsu-gray-dark">
            <tr>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">Status</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">Dashboard Title</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">Published</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">Rows</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">Run Date</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">Data Checks</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wsu-gray/10 bg-white">
            {publications.map((pub) => {
              const current = pub.slug === currentSlug;
              const editing = editingSlug === pub.slug;
              const pending = pendingSlug === pub.slug;

              return (
                <tr key={pub.slug} className={`align-top transition-colors ${current ? "bg-fotgs-green-soft/30" : "hover:bg-wsu-cream/30"}`}>
                  {/* Status */}
                  <td className="whitespace-nowrap px-3 py-3">
                    {current ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-fotgs-green-soft px-2.5 py-1 text-xs font-semibold text-fotgs-green">
                        <CheckCircle2 aria-hidden="true" className="size-3.5" />
                        Current
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={pending || pendingSlug !== null}
                        onClick={() => makeCurrent(pub.slug)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-wsu-gray/20 bg-white px-2.5 py-1 text-xs font-semibold text-wsu-gray-dark hover:bg-wsu-cream disabled:opacity-50"
                      >
                        {pending ? (
                          <Loader2 aria-hidden="true" className="size-3.5 animate-spin text-wsu-crimson" />
                        ) : (
                          <Radio aria-hidden="true" className="size-3.5 text-wsu-gray" />
                        )}
                        Set current
                      </button>
                    )}
                  </td>

                  {/* Title & Editing */}
                  <td className="min-w-[16rem] px-3 py-3">
                    {editing ? (
                      <div className="flex min-w-[15rem] items-center gap-2">
                        <input
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          maxLength={200}
                          aria-label="Dashboard title"
                          autoFocus
                          className="min-w-0 flex-1 rounded-md border border-wsu-gray/25 px-2 py-1.5 text-sm text-wsu-gray-dark focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
                        />
                        <button
                          type="button"
                          onClick={() => saveTitle(pub.slug)}
                          disabled={pending}
                          aria-label="Save dashboard title"
                          title="Save dashboard title"
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-wsu-crimson text-white hover:bg-wsu-crimson-dark disabled:opacity-50"
                        >
                          <Save aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={pending}
                          aria-label="Cancel title edit"
                          title="Cancel title edit"
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-wsu-gray/20 bg-white text-wsu-gray-dark hover:bg-wsu-cream disabled:opacity-50"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-wsu-gray-dark">{pub.title}</span>
                          <button
                            type="button"
                            onClick={() => startEditing(pub.slug, pub.title)}
                            disabled={pending}
                            aria-label={`Edit title for ${pub.title}`}
                            title="Edit dashboard title"
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded text-wsu-gray hover:text-wsu-crimson disabled:opacity-50"
                          >
                            <Pencil aria-hidden="true" className="size-3" />
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-wsu-gray">{pub.sourceFileName}</p>
                      </div>
                    )}
                  </td>

                  {/* Published */}
                  <td className="whitespace-nowrap px-3 py-3 text-wsu-gray-dark">
                    {formatDashboardDate(pub.updated_at, true)}
                  </td>

                  {/* Rows */}
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-wsu-gray-dark">
                    {pub.rowCount.toLocaleString()}
                  </td>

                  {/* Run Date */}
                  <td className="whitespace-nowrap px-3 py-3 text-wsu-gray">
                    {pub.runDates.map((d) => formatDashboardDate(d, false)).join(", ") || "N/A"}
                  </td>

                  {/* Data checks */}
                  <td className="min-w-[18rem] px-3 py-3 text-xs leading-relaxed text-wsu-gray">
                    <div>
                      <span>Degree incomplete: </span>
                      <strong className="text-wsu-gray-dark">{pub.workdayDegreeIncompleteCount.toLocaleString()}</strong>
                      {" · "}
                      <span>Rank incomplete: </span>
                      <strong className="text-wsu-gray-dark">{pub.workdayRankIncompleteCount.toLocaleString()}</strong>
                    </div>
                    <div className="mt-0.5">
                      <span>Similar-name groups: </span>
                      <strong className="text-wsu-gray-dark">{pub.duplicateNameGroupCount.toLocaleString()}</strong>
                      {pub.duplicateEmplidCount > 0 ? (
                        <>
                          {" · "}
                          <span className="font-semibold text-amber-800">
                            Duplicate EMPLIDs: {pub.duplicateEmplidCount.toLocaleString()}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/s/${pub.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-wsu-crimson hover:underline"
                      >
                        Snapshot
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => removePublication(pub.slug, pub.title)}
                        disabled={pending}
                        aria-label={`Delete ${pub.title}`}
                        title="Delete dashboard"
                        className="inline-flex size-7 items-center justify-center rounded text-wsu-gray hover:bg-wsu-red-soft hover:text-wsu-crimson disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </button>
                    </div>
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
