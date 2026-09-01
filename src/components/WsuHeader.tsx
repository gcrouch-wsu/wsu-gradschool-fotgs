"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import wsuLockup from "../../public/wsu-lockup-horz-rgb.jpg";

export function WsuHeader() {
  const pathname = usePathname() || "";
  const onAdmin = pathname.startsWith("/admin");
  const onLogin = pathname.startsWith("/admin/login");

  return (
    <header className="border-b border-wsu-gray/15 border-t-2 border-t-wsu-crimson bg-white shadow-xs">
      <div className="mx-auto flex min-h-[4.5rem] max-w-[90rem] items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/view" aria-label="Washington State University Graduate School faculty roster">
          <Image
            src={wsuLockup}
            alt="Washington State University"
            priority
            sizes="(max-width: 640px) 190px, 240px"
            className="h-auto w-[11.875rem] sm:w-[15rem]"
          />
        </Link>

        {!onLogin ? (
          <Link
            href="/admin"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-wsu-gray/20 bg-white px-3 py-2 text-xs font-semibold text-wsu-gray-dark shadow-xs transition-colors hover:border-wsu-crimson hover:text-wsu-crimson"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            <span>{onAdmin ? "Admin Dashboard" : "Admin Sign In"}</span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
