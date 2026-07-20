import { isAdminEmail } from "@/lib/admin";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Trends" },
  { href: "/memes", label: "Memes" },
  { href: "/mentions", label: "Mentions", auth: true },
  { href: "/feedback", label: "Feedback", auth: true },
  { href: "/brands", label: "Brands", auth: true },
] as const;

type Props = {
  children: React.ReactNode;
  pathname?: string;
};

function isActive(pathname: string | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/" || pathname.startsWith("/report");
  if (href === "/brands") return pathname.startsWith("/brands");
  if (href === "/mentions") return pathname.startsWith("/mentions");
  if (href === "/feedback") return pathname.startsWith("/feedback");
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Slim modern SaaS top chrome — four pillars + auth.
 */
export async function AppChrome({ children, pathname }: Props) {
  const user = await getUser();
  const admin = isAdminEmail(user?.email);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              className="shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]"
            >
              Signalbrief
            </Link>
            <nav className="flex items-center gap-0.5 overflow-x-auto">
              {NAV.filter((item) => !("auth" in item && item.auth) || user).map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition ${
                      active
                        ? "bg-[var(--ink)] font-medium text-white"
                        : "text-[var(--fog)] hover:bg-[var(--canvas)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm">
            {user ? (
              <>
                {admin && (
                  <span className="hidden text-[10px] uppercase tracking-wide text-[var(--fog)] sm:inline">
                    Admin
                  </span>
                )}
                <Link
                  href="/settings/categories"
                  className="hidden text-[var(--fog)] transition hover:text-[var(--ink)] sm:inline"
                >
                  Settings
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-md px-2.5 py-1.5 text-[var(--fog)] transition hover:bg-[var(--canvas)] hover:text-[var(--ink)]"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-2.5 py-1.5 text-[var(--fog)] transition hover:text-[var(--ink)]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-[var(--ink)] px-3 py-1.5 font-medium text-white transition hover:opacity-90"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--fog)]">
        Signalbrief · US trends, memes, and brand listening
      </footer>
    </div>
  );
}
