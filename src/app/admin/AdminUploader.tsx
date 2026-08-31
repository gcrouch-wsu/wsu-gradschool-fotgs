"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, UploadCloud } from "lucide-react";

type UploadResult = {
  slug: string;
  publicUrl: string;
  slugUrl: string;
  rowCount: number;
  runDates: string[];
  duplicateEmplidCount: number;
  duplicateNameGroupCount: number;
  workdayDegreeIncompleteCount: number;
  workdayRankIncompleteCount: number;
};

export function AdminUploader() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;
    setPending(true);
    setError(null);
    setResult(null);

    const formData = new FormData(formRef.current);
    const res = await fetch("/api/admin/publications", {
      method: "POST",
      body: formData,
    });
    const body = (await res.json().catch(() => ({}))) as UploadResult & { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Upload failed.");
      return;
    }
    setResult(body);
    formRef.current.reset();
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-wsu-gray/15 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-wsu-gray-dark">Publish OBIEE export</h2>
          <p className="mt-1 text-sm leading-relaxed text-wsu-gray">
            Required upload columns: Updated on, EMPLID, names, degree, rank, track/status,
            FOTGS status, appointment status, and research webpage. Upload `.csv` or `.xlsx`.
          </p>
        </div>
        <FileSpreadsheet aria-hidden="true" className="hidden size-6 text-wsu-crimson sm:block" />
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="block text-sm font-medium text-wsu-gray-dark">
          Dashboard title
          <input
            name="title"
            defaultValue="Faculty Of The Graduate School FOTGS"
            maxLength={200}
            className="mt-1.5 w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2.5 text-base text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
          />
        </label>
        <label className="block text-sm font-medium text-wsu-gray-dark">
          OBIEE export
          <input
            name="file"
            type="file"
            accept=".csv,.xlsx"
            required
            className="mt-1.5 block w-full rounded-md border border-dashed border-wsu-gray/30 bg-wsu-cream/45 px-3 py-2 text-sm text-wsu-gray-dark file:mr-3 file:rounded-md file:border-0 file:bg-wsu-crimson file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-wsu-crimson-dark"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-wsu-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wsu-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadCloud aria-hidden="true" className="size-4" />
          {pending ? "Publishing..." : "Publish"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-md border border-fotgs-green/25 bg-fotgs-green-soft px-3 py-3 text-sm text-wsu-gray-dark">
          <p className="font-semibold">Published {result.rowCount.toLocaleString()} faculty rows.</p>
          <p className="mt-1">
            Workday incomplete: {result.workdayDegreeIncompleteCount.toLocaleString()} degree,
            {" "}
            {result.workdayRankIncompleteCount.toLocaleString()} rank. Similar-name groups:
            {" "}
            {result.duplicateNameGroupCount.toLocaleString()}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={result.publicUrl}
              target="_blank"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-fotgs-green shadow-sm hover:bg-white/85"
            >
              Open current view
            </Link>
            <Link
              href={result.slugUrl}
              target="_blank"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-fotgs-green shadow-sm hover:bg-white/85"
            >
              Open snapshot
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
