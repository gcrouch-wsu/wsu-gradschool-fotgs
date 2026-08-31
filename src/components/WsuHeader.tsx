"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";

export function WsuHeader() {
  const pathname = usePathname() || "";
  const onAdmin = pathname.startsWith("/admin");
  const onLogin = pathname.startsWith("/admin/login");

  return (
    <header className="border-b border-wsu-crimson-dark/30 bg-wsu-crimson text-white shadow-xs">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
            Washington State University
          </span>
          <Link
            href="/view"
            className="text-lg font-bold tracking-tight text-white hover:text-white/90 transition-colors"
          >
            Graduate School <span className="font-normal text-white/75">|</span> Faculty Roster (FOTGS)
          </Link>
        </div>

        {!onLogin ? (
          <Link
            href="/admin"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white/20 hover:border-white/40 sm:self-center"
          >
            <ShieldCheck aria-hidden="true" className="size-4 text-white/90" />
            <span>{onAdmin ? "Admin Dashboard" : "Admin Sign In"}</span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
