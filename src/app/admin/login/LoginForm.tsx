"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Sign-in failed.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-wsu-gray-dark">
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="mt-1.5 w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2.5 text-base text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
          required
        />
      </label>
      <label className="block text-sm font-medium text-wsu-gray-dark">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2.5 text-base text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
          required
        />
      </label>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-wsu-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wsu-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn aria-hidden="true" className="size-4" />
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
