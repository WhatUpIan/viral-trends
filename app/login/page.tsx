import { AuthForm } from "@/components/AuthForm";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Log in — Signalbrief" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-8 text-[var(--paper)] sm:px-8">
        <div className="mx-auto max-w-sm">
          <Link href="/" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
            ← Signalbrief
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Log in
          </h1>
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-10 sm:px-0">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </main>
  );
}
