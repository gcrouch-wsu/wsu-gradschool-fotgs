import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-lg border border-wsu-gray/15 bg-white p-8 shadow-sm">
        <FileQuestion className="mx-auto size-12 text-wsu-crimson" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-wsu-gray-dark">Page Not Found</h1>
        <p className="mt-2 text-sm text-wsu-gray">
          The requested publication snapshot or page does not exist or has been removed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/view"
            className="inline-flex items-center gap-1.5 rounded-md bg-wsu-crimson px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wsu-crimson-dark"
          >
            <Home className="size-4" />
            Go to Faculty Roster
          </Link>
        </div>
      </div>
    </main>
  );
}
