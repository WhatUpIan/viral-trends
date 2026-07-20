import { AppChrome } from "@/components/AppChrome";
import { ReportView } from "@/components/ReportView";
import { formatReportDate } from "@/lib/format";
import { getUserCategoryPrefs } from "@/lib/prefs";
import { getReportByDate } from "@/lib/reports";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ date: string }>;
};

export default async function ReportDatePage({ params }: Props) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const report = await getReportByDate(date);

  if (!report || report.trends.length === 0) {
    return (
      <AppChrome pathname="/">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <p className="mb-6 text-[var(--fog)]">No report found for {date}.</p>
          <Link href="/" className="text-[var(--ink)] underline underline-offset-4">
            Back to Trends
          </Link>
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome pathname="/">
      <div className="page-hero">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Archive
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {formatReportDate(report.reportDate)}
          </h1>
          <p className="mt-2 text-sm text-[var(--fog)]">
            {report.trends.length} ranked trends
            {report.summary ? ` · ${report.summary}` : ""}
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ReportView report={report} categoryPrefs={await getUserCategoryPrefs()} />
      </div>
      <div className="pb-10 text-center text-sm text-[var(--fog)]">
        <Link href="/archive" className="underline underline-offset-4">
          Browse archive
        </Link>
      </div>
    </AppChrome>
  );
}
