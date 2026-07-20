"use client";

import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = searchParams.get("next") ?? "/";
  const supabaseReady = isBrowserSupabaseConfigured();
  const urlError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabaseReady) {
      setError(
        "Supabase is not configured locally. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev.",
      );
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          setBusy(false);
          return;
        }
        router.push(next);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      if (data.session) {
        router.push(next);
        router.refresh();
        return;
      }
      setNotice("Check your email to confirm your account, then log in.");
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!supabaseReady && (
        <p className="rounded-md border border-[var(--heat)]/30 bg-[var(--heat)]/5 px-3 py-2 text-sm text-[var(--heat)]">
          Local auth needs Supabase keys in <code className="text-xs">.env.local</code>. Copy them
          from your Vercel project or Supabase dashboard, then restart the dev server.
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
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

      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
          placeholder="••••••••"
        />
      </div>

      {urlError && !error && (
        <p className="text-sm text-[var(--heat)]">{decodeURIComponent(urlError)}</p>
      )}
      {error && <p className="text-sm text-[var(--heat)]">{error}</p>}
      {notice && <p className="text-sm text-[var(--ink)]">{notice}</p>}

      <button type="submit" disabled={busy || !supabaseReady} className="btn-primary w-full">
        {busy ? "Working…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      {mode === "login" && (
        <p className="text-center text-sm text-[var(--fog)]">
          <Link
            href="/forgot-password"
            className="text-[var(--ink)] underline underline-offset-2"
          >
            Forgot password?
          </Link>
        </p>
      )}

      <p className="pt-2 text-center text-sm text-[var(--fog)]">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/signup" className="text-[var(--ink)] underline underline-offset-2">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--ink)] underline underline-offset-2">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
