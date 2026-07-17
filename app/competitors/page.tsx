import { AppShell } from "@/components/AppShell";
import { getCompetitorCompare } from "@/lib/competitors";
import { slugify } from "@/lib/entities";
import { getGreetingName } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Competitors — Signalbrief" };

type Props = { searchParams: Promise<{ brand?: string }> };

export default async function CompetitorsPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect("/login?next=/competitors");

  const { brand: brandId } = await searchParams;
  const name = await getGreetingName();
  const rows = await getCompetitorCompare(brandId || undefined);

  return (
    <AppShell pathname="/competitors" greetingName={name}>
      <div className="px-5 py-8 sm:px-8">
        <header className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
            Module
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
            Competitors
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">
            Compare mention volume, sentiment, and estimated share of voice from your monitoring
            feed.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl">No brands yet</p>
            <Link href="/brands/new" className="btn-primary mt-4 inline-block">
              Add a brand
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {rows.map((row) => (
              <section key={row.brandId} className="border border-[var(--line)] bg-white">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
                  <div>
                    <Link
                      href={`/brands/${row.brandId}`}
                      className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] underline-offset-2 hover:underline"
                    >
                      {row.brandName}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--fog)]">
                      Mentions {row.brandMentions} · 7d {row.brandLast7} · Sentiment{" "}
                      {row.brandSentiment}
                      {row.shareOfVoice != null ? ` · SOV ~${row.shareOfVoice}%` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/competitors?brand=${row.brandId}`}
                    className="text-xs text-[var(--fog)] underline"
                  >
                    Focus
                  </Link>
                </div>

                {row.competitors.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-[var(--fog)]">
                    No competitors listed — add them via AI brand research or brand metadata.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b border-[var(--line)] text-[10px] uppercase tracking-wide text-[var(--fog)]">
                        <tr>
                          <th className="px-5 py-2 font-semibold">Competitor</th>
                          <th className="px-3 py-2 font-semibold">Mentions</th>
                          <th className="px-3 py-2 font-semibold">7d</th>
                          <th className="px-3 py-2 font-semibold">Sentiment</th>
                          <th className="px-3 py-2 font-semibold">+/~/−</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.competitors.map((c) => (
                          <tr key={c.name} className="border-b border-[var(--line)] last:border-0">
                            <td className="px-5 py-3">
                              <Link
                                href={`/entities/company/${slugify(c.name)}`}
                                className="font-medium hover:underline"
                              >
                                {c.name}
                              </Link>
                            </td>
                            <td className="px-3 py-3 tabular-nums">{c.mentionHits}</td>
                            <td className="px-3 py-3 tabular-nums">{c.last7}</td>
                            <td className="px-3 py-3">{c.sentimentLabel}</td>
                            <td className="px-3 py-3 tabular-nums text-[var(--fog)]">
                              {c.positive}/{c.neutral}/{c.negative}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
