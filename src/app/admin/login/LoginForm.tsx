"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
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
    } catch {
      setPending(false);
      setError("An unexpected network error occurred.");
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4" aria-busy={pending}>
      <div>
        <label htmlFor="admin-username" className="block text-sm font-medium text-wsu-gray-dark">
          Email address
        </label>
        <input
          id="admin-username"
          name="username"
          type="email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="email"
          autoFocus
          className="mt-1.5 w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2.5 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
          required
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="block text-sm font-medium text-wsu-gray-dark">
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2.5 pr-10 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-wsu-gray hover:text-wsu-gray-dark focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-wsu-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wsu-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <LogIn aria-hidden="true" className="size-4" />
            Sign in
          </>
        )}
      </button>
    </form>
  );
}
