import { AppShell } from "@/components/AppShell";
import { ReportHero } from "@/components/ReportHero";
import { ReportView } from "@/components/ReportView";
import { RunIngestButton } from "@/components/RunIngestButton";
import { isAdminEmail } from "@/lib/admin";
import { getGreetingName } from "@/lib/greeting";
import { MOCK_REPORT } from "@/lib/mock-data";
import { getUserCategoryPrefs } from "@/lib/prefs";
import { getReportByDate, getTodayDateString, listReports } from "@/lib/reports";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trends — Signalbrief" };

export default async function TrendsModulePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/trends");

  const name = await getGreetingName();
  const admin = isAdminEmail(user.email);
  const today = getTodayDateString();
  let report = await getReportByDate(today);

  if (!report || report.trends.length === 0) {
    const recent = await listReports();
    if (recent[0]) report = await getReportByDate(recent[0].reportDate);
  }

  if ((!report || report.trends.length === 0) && process.env.USE_MOCK_REPORT === "true") {
    report = { ...MOCK_REPORT, reportDate: today };
  }

  return (
    <AppShell pathname="/trends" greetingName={name}>
      {admin && (
        <div className="flex justify-end border-b border-[var(--line)] px-5 py-3 sm:px-8">
          <RunIngestButton />
        </div>
      )}
      {!report || report.trends.length === 0 ? (
        <div>
          <ReportHero
            reportDate={today}
            summary="No live report yet. Run daily ingest (admin) once credentials are configured, or browse the mock preview."
            trendCount={0}
          />
          <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
              {admin && <RunIngestButton variant="primary" label="Run daily ingest now" />}
              <Link
                href="/preview"
                className="inline-block border border-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--paper)]"
              >
                View mock preview
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ReportHero
            reportDate={report.reportDate}
            summary={report.summary}
            trendCount={report.trends.length}
          />
          <ReportView report={report} categoryPrefs={await getUserCategoryPrefs()} />
        </>
      )}
    </AppShell>
  );
}
