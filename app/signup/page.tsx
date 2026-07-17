import { AuthForm } from "@/components/AuthForm";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Sign up — Signalbrief" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-8 text-[var(--paper)] sm:px-8">
        <div className="mx-auto max-w-sm">
          <Link href="/" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
            ← Signalbrief
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Create account
          </h1>
          <p className="mt-1 text-sm text-[var(--paper-muted)]">
            Save category priorities and monitor your brand mentions.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-10 sm:px-0">
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </main>
  );
}
