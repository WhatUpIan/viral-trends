import { AuthForm } from "@/components/AuthForm";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Log in — Signalbrief" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <div className="page-hero">
        <div className="mx-auto max-w-sm px-4 py-10 sm:px-6">
          <Link href="/" className="text-sm text-[var(--fog)] hover:text-[var(--ink)]">
            ← Signalbrief
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Log in
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">Access brands, mentions, and feedback.</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm flex-1 px-4 py-10 sm:px-6">
        <div className="saas-panel p-6">
          <Suspense>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
