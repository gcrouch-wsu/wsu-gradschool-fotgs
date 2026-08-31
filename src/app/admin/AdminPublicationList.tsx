"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Pencil, Radio, Save, Trash2, X } from "lucide-react";
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
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEditing(slug: string, title: string) {
    setError(null);
    setEditingSlug(slug);
    setEditingTitle(title);
  }

  function cancelEditing() {
    setEditingSlug(null);
    setEditingTitle("");
  }

  async function saveTitle(slug: string) {
    if (!editingTitle.trim()) {
      setError("Enter a dashboard title.");
      return;
    }
    setPendingSlug(slug);
    setError(null);
    const res = await fetch(`/api/admin/publications/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingTitle }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setPendingSlug(null);
    if (!res.ok) {
      setError(body.error ?? "Could not update the dashboard title.");
      return;
    }
    cancelEditing();
    router.refresh();
  }

  async function removePublication(slug: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setPendingSlug(slug);
    setError(null);
    const res = await fetch(`/api/admin/publications/${slug}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setPendingSlug(null);
    if (!res.ok) {
      setError(body.error ?? "Could not delete the dashboard.");
      return;
    }
    if (editingSlug === slug) cancelEditing();
    router.refresh();
  }

  async function makeCurrent(slug: string) {
    const res = await fetch(`/api/admin/publications/${slug}/current`, { method: "POST" });
    if (res.ok) router.refresh();
  }

  if (publications.length === 0) return null;

  return (
    <section className="rounded-lg border border-wsu-gray/15 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-wsu-gray-dark">Publications</h2>
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto rounded-md border border-wsu-gray/15">
        <table className="min-w-full divide-y divide-wsu-gray/15 text-left text-sm">
          <thead className="bg-wsu-cream/80 text-xs font-semibold uppercase text-wsu-gray-dark">
            <tr>
              <th className="whitespace-nowrap px-3 py-2.5">Status</th>
              <th className="whitespace-nowrap px-3 py-2.5">Dashboard</th>
              <th className="whitespace-nowrap px-3 py-2.5">Rows</th>
              <th className="whitespace-nowrap px-3 py-2.5">Run date</th>
              <th className="whitespace-nowrap px-3 py-2.5">Data checks</th>
              <th className="whitespace-nowrap px-3 py-2.5">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wsu-gray/10 bg-white">
            {publications.map((pub) => {
              const current = pub.slug === currentSlug;
              const editing = editingSlug === pub.slug;
              const pending = pendingSlug === pub.slug;
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
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 font-medium text-wsu-gray-dark">{pub.title}</span>
                        <button
                          type="button"
                          onClick={() => startEditing(pub.slug, pub.title)}
                          disabled={pending}
                          aria-label={`Edit ${pub.title}`}
                          title="Edit dashboard title"
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-wsu-gray/20 bg-white text-wsu-gray hover:border-wsu-crimson/30 hover:text-wsu-crimson disabled:opacity-50"
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-wsu-gray">{formatDate(pub.updated_at)}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{pub.rowCount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-3">{pub.runDates.join(", ") || "Blank"}</td>
                  <td className="min-w-[18rem] px-3 py-3 text-wsu-gray">
                    Degree incomplete: {pub.workdayDegreeIncompleteCount.toLocaleString()} · Rank
                    incomplete: {pub.workdayRankIncompleteCount.toLocaleString()} · Similar names:
                    {" "}
                    {pub.duplicateNameGroupCount.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/s/${pub.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-wsu-crimson hover:underline"
                      >
                        Snapshot
                        <ExternalLink aria-hidden="true" className="size-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => removePublication(pub.slug, pub.title)}
                        disabled={pending}
                        aria-label={`Delete ${pub.title}`}
                        title="Delete dashboard"
                        className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
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
