"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for client monitoring
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-lg border border-red-200 bg-white p-8 shadow-sm">
        <AlertOctagon className="mx-auto size-12 text-wsu-crimson" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-wsu-gray-dark">Something went wrong</h1>
        <p className="mt-2 text-sm text-wsu-gray">
          An unexpected error occurred while loading this view.
        </p>
        {error.message ? (
          <p className="mt-3 rounded bg-red-50 p-2 font-mono text-xs text-red-900">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 rounded-md bg-wsu-crimson px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wsu-crimson-dark"
          >
            <RotateCcw className="size-4" />
            Try again
          </button>
          <Link
            href="/view"
            className="inline-flex items-center gap-1.5 rounded-md border border-wsu-gray/20 bg-white px-4 py-2 text-sm font-semibold text-wsu-gray-dark hover:bg-wsu-cream"
          >
            Go to Roster
          </Link>
        </div>
      </div>
    </main>
  );
}
