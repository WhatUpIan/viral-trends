import { AppShell } from "@/components/AppShell";
import { entityHref, listEntities } from "@/lib/entities";
import { getGreetingName } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trend Database — Signalbrief" };

export default async function TrendDatabasePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/database");
  const name = await getGreetingName();
  const trends = await listEntities({ type: "trend", limit: 80, orderBy: "heat" });

  return (
    <AppShell pathname="/database" greetingName={name}>
      <div className="px-5 py-8 sm:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
              Permanent catalog
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
              Trend Database
            </h1>
            <p className="mt-1 text-sm text-[var(--fog)]">
              Living trend entities — not just today&apos;s report. Populated by daily ingest.
            </p>
          </div>
          <Link href="/trends" className="text-xs underline hover:text-[var(--ink)]">
            Today&apos;s report →
          </Link>
        </header>

        {trends.length === 0 ? (
          <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              No trend entities yet
            </p>
            <p className="mt-2 text-sm text-[var(--fog)]">
              Run the daily ingest cron — it upserts permanent trend / creator / sound entities.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
            {trends.map((t) => (
              <li key={t.id}>
                <Link
                  href={entityHref(t)}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--paper)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--ink)]">{t.name}</p>
                    <p className="text-xs text-[var(--fog)]">
                      {t.status}
                      {t.firstSeenAt ? ` · first ${t.firstSeenAt.slice(0, 10)}` : ""}
                      {t.peakAt ? ` · peak ${t.peakAt.slice(0, 10)}` : ""}
                      {typeof t.attrs.category === "string" ? ` · ${t.attrs.category}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-sm text-[var(--heat)]">
                    {t.metrics.heat ?? "—"}
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
