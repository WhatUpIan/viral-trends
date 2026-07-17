import { listBrands } from "@/lib/brands";
import { AppShell } from "@/components/AppShell";
import { RunMonitoringButton } from "@/components/RunMonitoringButton";
import { getGreetingName } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Brands — Signalbrief" };

export default async function BrandsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands");

  const brands = await listBrands();
  const name = await getGreetingName();

  return (
    <AppShell pathname="/brands" greetingName={name}>
      <div className="border-b border-[var(--line)] px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
              Brands
            </h1>
            <p className="mt-1 text-sm text-[var(--fog)]">
              Brand entities — health, mentions, keywords, and audience feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {brands.length > 0 && (
              <RunMonitoringButton label="Run all monitoring" variant="outline" />
            )}
            <Link
              href="/brands/new"
              className="bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] transition hover:opacity-90"
            >
              Add brand
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 py-10 sm:px-8">
        {brands.length === 0 ? (
          <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
            <p className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              No brands yet
            </p>
            <p className="mb-6 text-sm text-[var(--fog)]">
              Add your brand — AI will compile profile, socials, and keywords — then scan social and
              the web for mentions.
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
    </AppShell>
  );
}
