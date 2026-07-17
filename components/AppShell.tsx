import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/brief", label: "Brief" },
  { href: "/trends", label: "Trends" },
  { href: "/brands", label: "Brands" },
  { href: "/settings/categories", label: "Settings" },
] as const;

type Props = {
  children: React.ReactNode;
  /** Current path for active nav highlighting */
  pathname?: string;
  greetingName?: string | null;
};

function isActive(pathname: string | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/brands") return pathname.startsWith("/brands");
  if (href === "/trends") return pathname.startsWith("/trends") || pathname.startsWith("/report");
  if (href === "/settings/categories") return pathname.startsWith("/settings");
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Bloomberg/Notion-style shell for authenticated Internet Intelligence modules.
 */
export function AppShell({ children, pathname, greetingName }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] lg:flex-row">
      <aside className="border-b border-[var(--line)] bg-[var(--ink)] text-[var(--paper)] lg:w-52 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-[var(--ink-muted)]">
        <div className="flex h-full flex-col px-4 py-4 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <Link
                href="/dashboard"
                className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--paper)]"
              >
                Signalbrief
              </Link>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--paper-muted)]">
                Internet Intelligence
              </p>
            </div>
          </div>

          <nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-8 lg:flex-col lg:overflow-visible">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap px-3 py-2 text-sm transition ${
                    active
                      ? "bg-[var(--paper)] font-medium text-[var(--ink)]"
                      : "text-[var(--paper-muted)] hover:bg-[var(--ink-muted)] hover:text-[var(--paper)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex items-center gap-3 lg:mt-auto lg:flex-col lg:items-stretch lg:pt-8">
            {greetingName && (
              <p className="truncate text-xs text-[var(--paper-muted)] lg:px-3">{greetingName}</p>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-[var(--paper-muted)] transition hover:text-[var(--paper)] lg:w-full lg:px-3 lg:py-2 lg:text-left"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
