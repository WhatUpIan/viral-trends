import { AppShell } from "@/components/AppShell";
import { entityHref } from "@/lib/entities";
import { getGreetingName } from "@/lib/greeting";
import { scoreOpportunities } from "@/lib/opportunity";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Opportunities — Signalbrief" };

export default async function OpportunitiesPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/opportunities");

  const name = await getGreetingName();
  const scores = await scoreOpportunities(30);

  return (
    <AppShell pathname="/opportunities" greetingName={name}>
      <div className="px-5 py-8 sm:px-8">
        <header className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
            Killer feature
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
            Opportunity Engine
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--fog)]">
            High-heat trends with industry white space — “nobody in your vertical has done this
            yet.” Scores are estimates from the entity graph, not a full market census.
          </p>
        </header>

        {scores.length === 0 ? (
          <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl">No trends to score</p>
            <p className="mt-2 text-sm text-[var(--fog)]">
              Run daily ingest to populate the Trend Database, then return here.
            </p>
            <Link href="/database" className="mt-4 inline-block text-sm underline">
              Open Trend Database
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {scores.map((o) => (
              <li key={o.trend.id} className="border border-[var(--line)] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={entityHref(o.trend)}
                      className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] hover:underline"
                    >
                      {o.trend.name}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">{o.rationale}</p>
                    <p className="mt-2 text-xs text-[var(--fog)]">
                      Best-fit industries: {o.bestFitIndustries.join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--fog)]">
                      Opportunity
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                      {o.score}
                    </p>
                    <p className="text-xs text-[var(--fog)]">heat {o.heat}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.industryPresence
                    .filter((i) => i.estimate === 0)
                    .slice(0, 6)
                    .map((i) => (
                      <span key={i.industry} className="keyword-pill">
                        {i.industry}: 0
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
