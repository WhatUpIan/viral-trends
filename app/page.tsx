import { ReportHero } from "@/components/ReportHero";
import { ReportView } from "@/components/ReportView";
import { MOCK_REPORT } from "@/lib/mock-data";
import { getReportByDate, getTodayDateString } from "@/lib/reports";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
          summary="No live report yet. Showing setup state — run the daily ingest cron once credentials are configured, or browse the mock preview."
          trendCount={0}
        />
        <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8">
          <p className="mb-6 text-[var(--fog)]">
            Connect Supabase + CreatorCrawl, then hit the ingest endpoint to generate today&apos;s
            brief.
          </p>
          <Link
            href="/preview"
            className="inline-block bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:opacity-90"
          >
            View mock preview
          </Link>
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
      <ReportView report={report} />
      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--fog)]">
        Signalbrief · Act early on short-form signals
      </footer>
    </main>
  );
}
