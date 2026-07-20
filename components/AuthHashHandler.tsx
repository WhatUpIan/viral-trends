"use client";

import { createClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Handles Supabase recovery / invite links that land with tokens in the URL hash
 * (when Site URL redirect_to is the homepage instead of /auth/callback).
 */
export function AuthHashHandler() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;
    if (type !== "recovery" && type !== "invite" && type !== "magiclink") return;

    let cancelled = false;
    setBusy(true);

    (async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Clear hash so refresh doesn't re-process
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (cancelled) return;
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        if (type === "recovery" || type === "invite") {
          router.replace("/reset-password");
          return;
        }
        router.replace("/");
        router.refresh();
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Auth link failed";
          router.replace(`/login?error=${encodeURIComponent(msg)}`);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!busy) return null;

  return (
    <div className="fixed inset-x-0 top-14 z-50 border-b border-[var(--line)] bg-white px-4 py-2 text-center text-sm text-[var(--fog)]">
      Completing sign-in…
    </div>
  );
}
