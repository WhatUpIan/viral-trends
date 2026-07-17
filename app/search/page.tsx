import { AppShell } from "@/components/AppShell";
import { entityHref, searchEntities, type EntityType } from "@/lib/entities";
import { getGreetingName } from "@/lib/greeting";
import { listBrands } from "@/lib/brands";
import { getReportByDate, getTodayDateString, listReports } from "@/lib/reports";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search — Signalbrief" };

type Props = { searchParams: Promise<{ q?: string }> };

const GROUP_ORDER: EntityType[] = [
  "trend",
  "sound",
  "creator",
  "topic",
  "company",
  "brand",
  "product",
  "meme",
  "news",
  "keyword",
  "video",
];

export default async function SearchPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect("/login?next=/search");

  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim();
  const name = await getGreetingName();

  const entities = q ? await searchEntities(q, { limit: 50 }) : [];
  const byType = new Map<EntityType, typeof entities>();
  for (const e of entities) {
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }

  // Also surface matching brand rows + report trends by title (even before entity upsert)
  const brands = q
    ? (await listBrands()).filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))
    : [];

  let reportHits: { title: string; heat: number; href: string }[] = [];
  if (q) {
    const today = getTodayDateString();
    let report = await getReportByDate(today);
    if (!report) {
      const list = await listReports();
      if (list[0]) report = await getReportByDate(list[0].reportDate);
    }
    reportHits = (report?.trends ?? [])
      .filter((t) => t.title.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8)
      .map((t) => ({
        title: t.title,
        heat: t.heatScore,
        href: `/database/${encodeURIComponent(
          // best-effort slug match used at ingest time
          `${t.platform}-${t.externalId}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        )}`,
      }));
  }

  return (
    <AppShell pathname="/search" greetingName={name}>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Search
        </h1>
        <p className="mt-1 text-sm text-[var(--fog)]">
          One query across trends, sounds, creators, topics, brands, and more.
        </p>

        <form className="mt-6 flex gap-2" action="/search" method="get">
          <input
            name="q"
            defaultValue={q}
            className="auth-input flex-1"
            placeholder="e.g. fishing, stormwater, AI selfie…"
            autoFocus
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        {!q && (
          <p className="mt-10 text-sm text-[var(--fog)]">
            Try a topic, brand, sound, or creator handle.
          </p>
        )}

        {q && (
          <div className="mt-10 space-y-10">
            {brands.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fog)]">
                  Brands
                </h2>
                <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
                  {brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/brands/${b.id}`}
                        className="block px-4 py-3 text-sm hover:bg-[var(--paper)]"
                      >
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {reportHits.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fog)]">
                  Today&apos;s report matches
                </h2>
                <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
                  {reportHits.map((t) => (
                    <li key={t.href + t.title}>
                      <Link
                        href={t.href}
                        className="flex justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--paper)]"
                      >
                        <span className="truncate">{t.title}</span>
                        <span className="tabular-nums text-[var(--heat)]">{t.heat}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {GROUP_ORDER.map((type) => {
              const list = byType.get(type);
              if (!list?.length) return null;
              return (
                <section key={type}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fog)]">
                    {type}s
                  </h2>
                  <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
                    {list.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={entityHref(e)}
                          className="flex justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--paper)]"
                        >
                          <span className="truncate">{e.name}</span>
                          <span className="text-[var(--fog)]">{e.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            {entities.length === 0 && brands.length === 0 && reportHits.length === 0 && (
              <p className="text-sm text-[var(--fog)]">
                No matches for “{q}”. Try another term, or wait for ingest to grow the entity graph.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
