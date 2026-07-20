import { AppChrome } from "@/components/AppChrome";
import { MentionsList } from "@/components/MentionsList";
import { RunMonitoringButton } from "@/components/RunMonitoringButton";
import { getBrandMentions, listBrands, type BrandMention } from "@/lib/brands";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mentions — Signalbrief" };

export default async function MentionsHubPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/mentions");

  const brands = await listBrands();
  const all: (BrandMention & { brandId: string; brandName: string })[] = [];

  for (const brand of brands) {
    const mentions = await getBrandMentions(brand.id, 40);
    for (const m of mentions) {
      all.push({ ...m, brandId: brand.id, brandName: brand.name });
    }
  }

  all.sort((a, b) => {
    const ta = Date.parse(a.publishedAt ?? a.createdAt) || 0;
    const tb = Date.parse(b.publishedAt ?? b.createdAt) || 0;
    return tb - ta;
  });

  // MentionsList expects a single brandId for flags — show grouped by brand instead
  const byBrand = brands.map((b) => ({
    brand: b,
    mentions: all.filter((m) => m.brandId === b.id).slice(0, 30),
  }));

  return (
    <AppChrome pathname="/mentions">
      <div className="page-hero">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Mentions
            </h1>
            <p className="mt-1 text-sm text-[var(--fog)]">
              Social and web mentions across your brands.
            </p>
          </div>
          <div className="flex gap-2">
            {brands.length > 0 && <RunMonitoringButton label="Run all monitoring" />}
            <Link href="/brands/new" className="btn-primary">
              Add brand
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {brands.length === 0 ? (
          <div className="saas-panel px-6 py-14 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl">No brands yet</p>
            <p className="mt-2 text-sm text-[var(--fog)]">
              Add a brand with AI setup to start tracking mentions.
            </p>
            <Link href="/brands/new" className="btn-primary mt-6 inline-block">
              Add brand
            </Link>
          </div>
        ) : (
          byBrand.map(({ brand, mentions }) => (
            <section key={brand.id}>
              <div className="mb-3 flex items-center justify-between">
                <Link
                  href={`/brands/${brand.id}`}
                  className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] hover:underline"
                >
                  {brand.name}
                </Link>
                <span className="text-xs text-[var(--fog)]">{mentions.length} shown</span>
              </div>
              <MentionsList mentions={mentions} brandId={brand.id} />
            </section>
          ))
        )}
      </div>
    </AppChrome>
  );
}
