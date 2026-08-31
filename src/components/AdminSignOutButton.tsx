"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AdminSignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex items-center gap-2 rounded-md border border-wsu-gray/20 bg-white px-3 py-2 text-sm font-semibold text-wsu-gray-dark shadow-sm transition hover:border-wsu-crimson/30 hover:bg-wsu-red-soft"
    >
      <LogOut aria-hidden="true" className="size-4" />
      Sign out
    </button>
  );
}
