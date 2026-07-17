import { AppShell } from "@/components/AppShell";
import { getOrCreateMorningBrief } from "@/lib/brief";
import { formatReportDate } from "@/lib/format";
import { getGreetingName, timeOfDayGreeting } from "@/lib/greeting";
import { getTodayDateString } from "@/lib/reports";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { refreshBrief } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Morning Brief — Signalbrief" };

export default async function BriefPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brief");

  const name = await getGreetingName();
  const brief = await getOrCreateMorningBrief(user.id);
  const today = getTodayDateString();

  return (
    <AppShell pathname="/brief" greetingName={name}>
      <article className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
              AI Analyst
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
              {brief.headline}
            </h1>
            <p className="mt-1 text-sm text-[var(--fog)]">
              {formatReportDate(today)} · {timeOfDayGreeting()}
              {name ? `, ${name}` : ""}
            </p>
          </div>
          <form action={refreshBrief}>
            <button type="submit" className="btn-secondary text-xs">
              Regenerate
            </button>
          </form>
        </div>

        <p className="text-lg text-[var(--ink-soft)]">{brief.intro}</p>

        <ul className="mt-8 space-y-4">
          {brief.bullets.map((b, i) => (
            <li
              key={i}
              className="border-l-2 border-[var(--ink)] pl-4 text-[15px] leading-relaxed text-[var(--ink)]"
            >
              {b}
            </li>
          ))}
        </ul>

        {brief.opportunity && (
          <div className="mt-10 border border-[var(--ink)] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fog)]">
              Opportunity
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]">
              {brief.opportunity}
            </p>
          </div>
        )}

        <p className="mt-10 text-xs text-[var(--fog)]">
          Source: {brief.source === "openai" ? "AI analyst" : "template"} ·{" "}
          <Link href="/trends" className="underline hover:text-[var(--ink)]">
            Open trends module
          </Link>{" "}
          ·{" "}
          <Link href="/dashboard" className="underline hover:text-[var(--ink)]">
            Dashboard
          </Link>
        </p>
      </article>
    </AppShell>
  );
}
