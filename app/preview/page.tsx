import { AppChrome } from "@/components/AppChrome";
import { ReportView } from "@/components/ReportView";
import { MOCK_REPORT } from "@/lib/mock-data";

export default function PreviewPage() {
  return (
    <AppChrome pathname="/">
      <div className="border-b border-[var(--line)] bg-[var(--accent-soft)] px-4 py-2 text-center text-xs text-[var(--accent-ink)] sm:px-6">
        Mock preview — sample data for UI development
      </div>
      <div className="page-hero">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Trends preview
          </h1>
          <p className="mt-2 text-sm text-[var(--fog)]">
            {MOCK_REPORT.trends.length} sample trends · {MOCK_REPORT.reportDate}
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ReportView report={MOCK_REPORT} />
      </div>
    </AppChrome>
  );
}
