"use client";

import { createBrowserClient } from "@supabase/ssr";

function isConfigured(url: string | undefined, key: string | undefined): boolean {
  if (!url?.trim() || !key?.trim()) return false;
  if (url.includes("[SENSITIVE]") || key.includes("[SENSITIVE]")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.includes("supabase");
  } catch {
    return false;
  }
}

export function isBrowserSupabaseConfigured(): boolean {
  return isConfigured(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured(url, key)) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.",
    );
  }
  return createBrowserClient(url!, key!);
}
