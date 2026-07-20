import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/settings", "/brands", "/mentions", "/feedback"];

/** Old Phase 2/3 routes → home or brands */
const REDIRECTS: Record<string, string> = {
  "/dashboard": "/",
  "/brief": "/",
  "/trends": "/",
  "/search": "/",
  "/database": "/",
  "/opportunities": "/",
  "/competitors": "/brands",
  "/assistant": "/",
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  if (REDIRECTS[path]) {
    const url = request.nextUrl.clone();
    url.pathname = REDIRECTS[path];
    return NextResponse.redirect(url);
  }
  if (
    path.startsWith("/database/") ||
    path.startsWith("/entities/") ||
    path.startsWith("/report/")
  ) {
    // keep /report/[date] for archive deep links — only redirect entity/database
    if (path.startsWith("/database/") || path.startsWith("/entities/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (needsAuth && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
