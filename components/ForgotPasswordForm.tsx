"use client";

import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabaseReady = isBrowserSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabaseReady) {
      setError("Supabase is not configured locally.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      setNotice("Check your email for a reset link. It expires in about an hour.");
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
          placeholder="you@company.com"
        />
      </div>

      {error && <p className="text-sm text-[var(--heat)]">{error}</p>}
      {notice && <p className="text-sm text-[var(--ink)]">{notice}</p>}

      <button type="submit" disabled={busy || !supabaseReady} className="btn-primary w-full">
        {busy ? "Sending…" : "Send reset link"}
      </button>

      <p className="pt-2 text-center text-sm text-[var(--fog)]">
        <Link href="/login" className="text-[var(--ink)] underline underline-offset-2">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
