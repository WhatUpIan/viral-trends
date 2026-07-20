import { AppChrome } from "@/components/AppChrome";
import { ReportView } from "@/components/ReportView";
import { RunIngestButton } from "@/components/RunIngestButton";
import { isAdminEmail } from "@/lib/admin";
import { formatReportDate } from "@/lib/format";
import { getLatestReport } from "@/lib/latest-report";
import { getUserCategoryPrefs } from "@/lib/prefs";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getUser();
  const admin = isAdminEmail(user?.email);
  const report = await getLatestReport();
  const prefs = user ? await getUserCategoryPrefs() : null;

  return (
    <AppChrome pathname="/">
      <div className="page-hero">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              US daily
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              Trends
            </h1>
            <p className="mt-2 text-sm text-[var(--fog)]">
              Remake-ready short-form signals across TikTok, YouTube, Instagram, X, and Reddit.
              {report
                ? ` · ${formatReportDate(report.reportDate)} · ${report.trends.length} ranked`
                : ""}
            </p>
            {report?.summary && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{report.summary}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {admin && <RunIngestButton variant="primary" />}
            {!user && (
              <Link href="/signup" className="btn-primary">
                Track your brand
              </Link>
            )}
            <Link href="/memes" className="btn-secondary">
              View memes
            </Link>
          </div>
        </div>
      </div>

      {!report ? (
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <div className="saas-panel mx-auto max-w-lg px-6 py-12">
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              No report yet
            </p>
            <p className="mt-2 text-sm text-[var(--fog)]">
              {admin
                ? "Run daily ingest to pull today’s US viral signals."
                : "Check back after the daily ingest, or sign in if you have access."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {admin && <RunIngestButton variant="primary" label="Run daily ingest now" />}
              <Link href="/preview" className="btn-secondary">
                Mock preview
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <ReportView report={report} categoryPrefs={prefs} />
        </div>
      )}
    </AppChrome>
  );
}
