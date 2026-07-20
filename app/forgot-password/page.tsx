import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import Link from "next/link";

export const metadata = { title: "Forgot password — Signalbrief" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <div className="page-hero">
        <div className="mx-auto max-w-sm px-4 py-10 sm:px-6">
          <Link href="/" className="text-sm text-[var(--fog)] hover:text-[var(--ink)]">
            ← Signalbrief
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Reset password
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">
            We’ll email you a link to choose a new password.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm flex-1 px-4 py-10 sm:px-6">
        <div className="saas-panel p-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
