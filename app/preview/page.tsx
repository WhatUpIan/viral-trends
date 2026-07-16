import { ReportHero } from "@/components/ReportHero";
import { ReportView } from "@/components/ReportView";
import { MOCK_REPORT } from "@/lib/mock-data";

export default function PreviewPage() {
  return (
    <main>
      <ReportHero
        reportDate={MOCK_REPORT.reportDate}
        summary={MOCK_REPORT.summary}
        trendCount={MOCK_REPORT.trends.length}
      />
      <div className="border-b border-[var(--line)] bg-[var(--paper-soft)] px-5 py-2 text-center text-xs text-[var(--fog)] sm:px-8">
        Mock preview — sample data for UI development
      </div>
      <ReportView report={MOCK_REPORT} />
      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--fog)]">
        Signalbrief · Act early on short-form signals
      </footer>
    </main>
  );
}
