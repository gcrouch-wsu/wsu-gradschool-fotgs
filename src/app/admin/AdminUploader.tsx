"use client";

import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function AdminUploader() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleFileSelected(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setError("Please select a .csv or .xlsx file.");
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    handleFileSelected(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) {
      handleFileSelected(file);
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;
    setPending(true);
    setError(null);
    setResult(null);

    const formData = new FormData(formRef.current);
    try {
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
      setSelectedFile(null);
      router.refresh();
    } catch {
      setPending(false);
      setError("Network or server error during upload.");
    }
  }

  return (
    <section className="rounded-lg border border-wsu-gray/15 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-wsu-gray-dark">Publish OBIEE export</h2>
          <p className="mt-1 text-sm leading-relaxed text-wsu-gray">
            Upload an OBIEE report (.csv or .xlsx). EMPLID is hashed for identity mapping and stripped
            from all public views.
          </p>
        </div>
        <FileSpreadsheet aria-hidden="true" className="hidden size-6 text-wsu-crimson sm:block" />
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-wsu-gray-dark">
          Dashboard title
          <input
            name="title"
            defaultValue="Faculty Of The Graduate School FOTGS"
            maxLength={200}
            className="mt-1.5 w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
          />
        </label>

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-wsu-crimson bg-wsu-red-soft/40"
              : selectedFile
              ? "border-fotgs-green bg-fotgs-green-soft/20"
              : "border-wsu-gray/25 bg-wsu-cream/40 hover:bg-wsu-cream/70"
          }`}
        >
          <input
            ref={fileInputRef}
            name="file"
            type="file"
            accept=".csv,.xlsx"
            required
            onChange={onFileInputChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Upload OBIEE export file (.csv or .xlsx)"
          />

          {selectedFile ? (
            <div className="relative z-10 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-6 text-fotgs-green" />
                <span className="text-sm font-semibold text-wsu-gray-dark">{selectedFile.name}</span>
                <span className="rounded bg-wsu-gray/10 px-2 py-0.5 text-xs text-wsu-gray">
                  {formatBytes(selectedFile.size)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedFile();
                  }}
                  title="Remove file"
                  className="ml-2 rounded p-1 text-wsu-gray hover:bg-wsu-gray/10 hover:text-wsu-gray-dark"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-xs text-wsu-gray">Click or drag a different file to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
              <UploadCloud className="size-8 text-wsu-gray" />
              <p className="text-sm font-medium text-wsu-gray-dark">
                Drag and drop your OBIEE <span className="font-semibold text-wsu-crimson">.csv</span> or{" "}
                <span className="font-semibold text-wsu-crimson">.xlsx</span> file here, or browse
              </p>
              <p className="text-xs text-wsu-gray">
                Requires: Updated on, EMPLID, names, degree, rank, track/status, FOTGS status, appointment status
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !selectedFile}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-wsu-crimson px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wsu-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Publishing dataset...
              </>
            ) : (
              <>
                <UploadCloud aria-hidden="true" className="size-4" />
                Publish to Dashboard
              </>
            )}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-md border border-fotgs-green/25 bg-fotgs-green-soft p-4 text-sm text-wsu-gray-dark">
          <div className="flex items-center gap-2 font-semibold text-fotgs-green">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            <span>Successfully published {result.rowCount.toLocaleString()} faculty rows!</span>
          </div>
          <p className="mt-1 text-xs text-wsu-gray-dark">
            Workday data check: {result.workdayDegreeIncompleteCount.toLocaleString()} degree incomplete,{" "}
            {result.workdayRankIncompleteCount.toLocaleString()} rank incomplete. Similar-name groups:{" "}
            {result.duplicateNameGroupCount.toLocaleString()}.
            {result.duplicateEmplidCount > 0 ? (
              <span className="block mt-1 font-medium text-amber-900">
                Notice: {result.duplicateEmplidCount.toLocaleString()} duplicate EMPLID(s) were found in the source file.
              </span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={result.publicUrl}
              target="_blank"
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-fotgs-green shadow-sm hover:bg-white/85"
            >
              Open current view (/view)
            </Link>
            <Link
              href={result.slugUrl}
              target="_blank"
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-fotgs-green shadow-sm hover:bg-white/85"
            >
              Open immutable snapshot (/s/{result.slug})
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
