"use client";

import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const supabaseReady = isBrowserSupabaseConfigured();

  useEffect(() => {
    if (!supabaseReady) {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();

      // Hash recovery tokens may land directly on this page
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(!!session);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseReady]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      setNotice("Password updated. Redirecting…");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-[var(--fog)]">Checking reset link…</p>;
  }

  if (!supabaseReady) {
    return (
      <p className="text-sm text-[var(--heat)]">
        Supabase is not configured. Add keys to <code>.env.local</code>.
      </p>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-[var(--heat)]">
          This reset link is missing or expired. Request a new one.
        </p>
        <Link href="/forgot-password" className="btn-primary inline-block">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label
          htmlFor="confirm"
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]"
        >
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="auth-input"
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-sm text-[var(--heat)]">{error}</p>}
      {notice && <p className="text-sm text-[var(--ink)]">{notice}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
