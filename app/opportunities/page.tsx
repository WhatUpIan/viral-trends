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
            Opportunity Engine v2
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
            Opportunities
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--fog)]">
            White-space scores from real industry adoption counts in the entity graph. Industries at
            0 brands = nobody in that vertical has linked to this trend yet (in our data).
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={entityHref(o.trend)}
                        className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] hover:underline"
                      >
                        {o.trend.name}
                      </Link>
                      {o.userIndustryFit && (
                        <span className="border border-[var(--ink)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          Your industry gap
                        </span>
                      )}
                      {o.evidenceThin && (
                        <span className="text-[10px] uppercase tracking-wide text-[var(--fog)]">
                          Thin evidence
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">{o.rationale}</p>
                    <p className="mt-2 text-xs text-[var(--fog)]">
                      Best-fit: {o.bestFitIndustries.join(" · ") || "—"}
                    </p>
                    {o.adoptingBrands.length > 0 && (
                      <p className="mt-1 text-xs text-[var(--fog)]">
                        Adopting:{" "}
                        {o.adoptingBrands.map((b, i) => (
                          <span key={b.slug}>
                            {i > 0 ? " · " : ""}
                            <Link
                              href={`/entities/company/${b.slug}`}
                              className="underline hover:text-[var(--ink)]"
                            >
                              {b.name}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
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
                    .slice()
                    .sort((a, b) => a.brandCount - b.brandCount)
                    .slice(0, 10)
                    .map((i) => (
                      <span
                        key={i.industry}
                        className={`keyword-pill ${i.brandCount === 0 ? "" : "opacity-70"}`}
                      >
                        {i.industry}: {i.brandCount}
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
