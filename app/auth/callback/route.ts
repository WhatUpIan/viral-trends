import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Handles email confirmation + password-recovery links (PKCE `?code=`).
 * Recovery should use redirectTo ending in /auth/callback?next=/reset-password
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", url.origin));
}
