import { AppShell } from "@/components/AppShell";
import { RunIngestButton } from "@/components/RunIngestButton";
import { isAdminEmail } from "@/lib/admin";
import { getDashboardData } from "@/lib/dashboard";
import { getGreetingName, timeOfDayGreeting } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Signalbrief" };

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border border-[var(--line)] bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--fog)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-[var(--fog)]">{hint}</p>}
    </div>
  );
}

function Sparkline({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex h-16 items-end gap-1">
      {days.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full bg-[var(--ink)]"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            title={`${d.date}: ${d.count}`}
          />
          <span className="text-[9px] text-[var(--fog)]">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/dashboard");

  const name = await getGreetingName();
  const data = await getDashboardData();
  const greeting = `${timeOfDayGreeting()}${name ? `, ${name}` : ""}`;

  const healthColor =
    data.kpis.brandHealth.label === "Positive"
      ? "text-emerald-700"
      : data.kpis.brandHealth.label === "Caution"
        ? "text-[var(--heat)]"
        : "text-[var(--fog)]";

  return (
    <AppShell pathname="/dashboard" greetingName={name}>
      <div className="px-5 py-8 sm:px-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
              My Dashboard
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-[var(--fog)]">
              Internet intelligence across brands, mentions, and viral signals.{" "}
              <Link href="/brief" className="underline hover:text-[var(--ink)]">
                Read morning brief
              </Link>
            </p>
          </div>
          {isAdminEmail(user.email) && <RunIngestButton variant="primary" />}
        </header>

        {/* KPI strip */}
        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Brand Health"
            value={
              data.kpis.brandHealth.label === "No data"
                ? "—"
                : `${data.kpis.brandHealth.label}`
            }
            hint={
              data.kpis.brandHealth.score > 0
                ? `Score ${data.kpis.brandHealth.score}`
                : undefined
            }
          />
          <Kpi label="Mentions Today" value={data.kpis.mentionsToday} />
          <Kpi label="Unread" value={data.kpis.unread} />
          <Kpi
            label="Trending Opportunities"
            value={data.kpis.trendingOpportunities}
            hint="Your industry white space"
          />
          <Kpi label="High Risk Alerts" value={data.kpis.highRiskAlerts} />
          <Kpi label="New Viral Trends" value={data.kpis.newViralTrends} />
        </section>

        <div className="mb-3 text-xs text-[var(--fog)]">
          Competitors mentioned (estimate): {data.kpis.competitorsMentioned}
          {!data.hasBrands && (
            <>
              {" · "}
              <Link href="/brands/new" className="underline hover:text-[var(--ink)]">
                Add your first brand
              </Link>
            </>
          )}
        </div>

        {/* Three columns */}
        <div className="grid gap-6 xl:grid-cols-12">
          {/* Left — Brand Health */}
          <section className="space-y-5 xl:col-span-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
              Brand Health
            </h2>
            <div className="border border-[var(--line)] bg-white p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--fog)]">
                Mentions over time
              </p>
              <Sparkline days={data.brandHealth.mentionsByDay} />
            </div>
            <div className="border border-[var(--line)] bg-white p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--fog)]">Sentiment</p>
              <p className={`text-sm font-medium ${healthColor}`}>
                {data.kpis.brandHealth.label}
                {data.kpis.brandHealth.score > 0 ? ` · ${data.kpis.brandHealth.score}` : ""}
              </p>
              <p className="mt-2 text-xs text-[var(--fog)]">
                +{data.brandHealth.sentiment.positive} / ~
                {data.brandHealth.sentiment.neutral} / −
                {data.brandHealth.sentiment.negative}
              </p>
            </div>
            <div className="border border-[var(--line)] bg-white p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--fog)]">
                Top keywords
              </p>
              {data.brandHealth.topKeywords.length === 0 ? (
                <p className="text-sm text-[var(--fog)]">No keyword hits yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.brandHealth.topKeywords.map((k) => (
                    <li key={k.keyword} className="flex justify-between gap-2">
                      <span className="truncate">{k.keyword}</span>
                      <span className="tabular-nums text-[var(--fog)]">{k.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border border-[var(--line)] bg-white p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--fog)]">
                New creators discussing you
              </p>
              {data.brandHealth.newCreators.length === 0 ? (
                <p className="text-sm text-[var(--fog)]">None indexed yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {data.brandHealth.newCreators.map((c) => (
                    <span key={c} className="keyword-pill">
                      @{c}
                    </span>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Center — Internet Right Now */}
          <section className="space-y-5 xl:col-span-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                Internet Right Now
              </h2>
              <Link href="/trends" className="text-xs text-[var(--fog)] underline hover:text-[var(--ink)]">
                Full trends report
              </Link>
            </div>
            {data.internetNow.summary && (
              <p className="border-l-2 border-[var(--ink)] pl-3 text-sm text-[var(--ink-soft)]">
                {data.internetNow.summary}
              </p>
            )}
            <div className="border border-[var(--line)] bg-white p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-[var(--fog)]">Top trends</p>
              {data.internetNow.topTrends.length === 0 ? (
                <p className="text-sm text-[var(--fog)]">No report loaded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.internetNow.topTrends.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ink)]">{t.title}</p>
                        <p className="text-xs text-[var(--fog)]">
                          {t.platform} · {t.category}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-xs text-[var(--heat)]">
                        {t.heatScore}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-[var(--line)] bg-white p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-[var(--fog)]">
                  Fastest growing
                </p>
                <ul className="space-y-2 text-sm">
                  {data.internetNow.fastestGrowing.slice(0, 4).map((t) => (
                    <li key={t.id} className="truncate">
                      {t.title}{" "}
                      <span className="text-[var(--fog)]">({t.heatScore})</span>
                    </li>
                  ))}
                  {data.internetNow.fastestGrowing.length === 0 && (
                    <li className="text-[var(--fog)]">—</li>
                  )}
                </ul>
              </div>
              <div className="border border-[var(--line)] bg-white p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-[var(--fog)]">Top sounds</p>
                <ul className="space-y-2 text-sm">
                  {data.internetNow.topSounds.map((s) => (
                    <li key={s.name} className="truncate">
                      {s.name}{" "}
                      <span className="text-[var(--fog)]">({s.heat})</span>
                    </li>
                  ))}
                  {data.internetNow.topSounds.length === 0 && (
                    <li className="text-[var(--fog)]">—</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="border border-[var(--line)] bg-white p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-[var(--fog)]">
                Most remixed format
              </p>
              <p className="text-sm font-medium text-[var(--ink)]">
                {data.internetNow.mostRemixedFormat ?? "—"}
              </p>
            </div>
          </section>

          {/* Right — Alerts */}
          <section className="space-y-5 xl:col-span-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
              Alerts
            </h2>
            <ul className="space-y-3">
              {data.alerts.map((a) => (
                <li
                  key={a.id}
                  className={`border px-4 py-3 text-sm ${
                    a.severity === "high"
                      ? "border-[var(--heat)] bg-white"
                      : "border-[var(--line)] bg-white"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fog)]">
                    {a.severity === "high"
                      ? "High risk"
                      : a.severity === "medium"
                        ? "Notable"
                        : "Signal"}
                  </p>
                  <p className="mt-1 text-[var(--ink-soft)]">{a.text}</p>
                  {a.href && (
                    <Link
                      href={a.href}
                      className="mt-2 inline-block text-xs underline hover:text-[var(--ink)]"
                    >
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
