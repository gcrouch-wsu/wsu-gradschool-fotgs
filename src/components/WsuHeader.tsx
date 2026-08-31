"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

export function WsuHeader() {
  const pathname = usePathname() || "";
  const onAdmin = pathname.startsWith("/admin");
  const onLogin = pathname.startsWith("/admin/login");

  return (
    <header className="border-b border-wsu-crimson-dark/20 bg-wsu-crimson text-white shadow-sm">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:px-6">
        <div>
          <Link href="/view" className="text-lg font-semibold text-white hover:text-white/90">
            Faculty Of The Graduate School
          </Link>
          <p className="text-xs font-medium uppercase text-white/75">
            Washington State University
          </p>
        </div>
        {!onLogin ? (
          <Link
            href="/admin"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase text-white transition hover:bg-white/20 sm:self-center"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            {onAdmin ? "Admin" : "Admin sign in"}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
