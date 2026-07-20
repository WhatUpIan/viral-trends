import { listBrands } from "@/lib/brands";
import { AppChrome } from "@/components/AppChrome";
import { RunMonitoringButton } from "@/components/RunMonitoringButton";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brands — Signalbrief" };

export default async function BrandsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands");

  const brands = await listBrands();

  return (
    <AppChrome pathname="/brands">
      <div className="page-hero">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Brands
            </h1>
            <p className="mt-1 text-sm text-[var(--fog)]">
              AI setup from name + URL — then monitor mentions and feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {brands.length > 0 && (
              <RunMonitoringButton label="Run all monitoring" variant="outline" />
            )}
            <Link href="/brands/new" className="btn-primary">
              Add brand
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {brands.length === 0 ? (
          <div className="saas-panel px-6 py-14 text-center">
            <p className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              No brands yet
            </p>
            <p className="mb-6 text-sm text-[var(--fog)]">
              Enter your brand name and website — AI compiles profile, socials, and keywords.
            </p>
            <Link href="/brands/new" className="btn-primary inline-block">
              Add your first brand
            </Link>
          </div>
        ) : (
          <ul className="saas-panel divide-y divide-[var(--line)] overflow-hidden">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/brands/${brand.id}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-[var(--canvas)]"
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
    </AppChrome>
  );
}
