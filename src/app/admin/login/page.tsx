import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin Sign In",
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-lg border border-wsu-gray/15 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-wsu-gray-dark">Admin sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-wsu-gray">
          Upload and publish Faculty Of The Graduate School FOTGS OBIEE exports.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
