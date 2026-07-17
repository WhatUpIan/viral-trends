import { ReportHero } from "@/components/ReportHero";
import { ReportView } from "@/components/ReportView";
import { MOCK_REPORT } from "@/lib/mock-data";
import { getUserCategoryPrefs } from "@/lib/prefs";
import { getReportByDate, getTodayDateString } from "@/lib/reports";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  const today = getTodayDateString();
  let report = await getReportByDate(today);

  if ((!report || report.trends.length === 0) && process.env.USE_MOCK_REPORT === "true") {
    report = { ...MOCK_REPORT, reportDate: today };
  }

  if (!report || report.trends.length === 0) {
    return (
      <main>
        <ReportHero
          reportDate={today}
          summary="Internet intelligence for marketers — sign in for your dashboard, or run ingest to populate today's public trends snapshot."
          trendCount={0}
        />
        <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8">
          <p className="mb-6 text-[var(--fog)]">
            Sign in for My Dashboard, Morning Brief, and brand monitoring — or preview the trends
            module.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-block bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              href="/preview"
              className="inline-block border border-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--paper)]"
            >
              View mock preview
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <ReportHero
        reportDate={report.reportDate}
        summary={report.summary}
        trendCount={report.trends.length}
      />
      <ReportView report={report} categoryPrefs={await getUserCategoryPrefs()} />
      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--fog)]">
        Signalbrief ·{" "}
        <Link href="/login" className="underline hover:text-[var(--ink)]">
          Sign in for your dashboard
        </Link>
      </footer>
    </main>
  );
}
