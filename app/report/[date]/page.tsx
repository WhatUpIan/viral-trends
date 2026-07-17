import { ReportHero } from "@/components/ReportHero";
import { ReportView } from "@/components/ReportView";
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
      <main>
        <ReportHero
          reportDate={date}
          summary={null}
          trendCount={0}
        />
        <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8">
          <p className="mb-6 text-[var(--fog)]">No report found for this date.</p>
          <Link href="/" className="text-[var(--ink)] underline underline-offset-4">
            Back to today
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
      <ReportView report={report} categoryPrefs={await getUserCategoryPrefs()} />
      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--fog)]">
        <Link href="/archive" className="underline underline-offset-4">
          Browse archive
        </Link>
      </footer>
    </main>
  );
}
