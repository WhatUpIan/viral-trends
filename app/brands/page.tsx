import { listBrands } from "@/lib/brands";
import { RunMonitoringButton } from "@/components/RunMonitoringButton";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Brand monitoring — Signalbrief" };

export default async function BrandsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands");

  const brands = await listBrands();

  return (
    <main className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-8 text-[var(--paper)] sm:px-8">
        <div className="mx-auto flex max-w-3xl items-end justify-between">
          <div>
            <Link href="/" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
              ← Signalbrief
            </Link>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight">
              Brand monitoring
            </h1>
            <p className="mt-1 text-sm text-[var(--paper-muted)]">
              Track mentions, keywords, and audience feedback across social and the web.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {brands.length > 0 && (
              <RunMonitoringButton
                label="Run all monitoring"
                variant="outline"
              />
            )}
            <Link
              href="/brands/new"
              className="bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] transition hover:opacity-90"
            >
              Add brand
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {brands.length === 0 ? (
          <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
            <p className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              No brands yet
            </p>
            <p className="mb-6 text-sm text-[var(--fog)]">
              Add your brand and we&apos;ll generate monitoring keywords, then scan social platforms
              and the web for mentions every few hours.
            </p>
            <Link href="/brands/new" className="btn-primary inline-block">
              Add your first brand
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/brands/${brand.id}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-[var(--paper)]"
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">{brand.name}</p>
                    <p className="text-xs text-[var(--fog)]">
                      {brand.website ?? "No website"} ·{" "}
                      {brand.status === "active" ? "Monitoring" : "Paused"}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-[var(--ink-soft)]">
                    {brand.mentionCount} mention{brand.mentionCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
