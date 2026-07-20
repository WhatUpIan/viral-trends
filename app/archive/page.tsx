import { AppChrome } from "@/components/AppChrome";
import { formatReportDate } from "@/lib/format";
import { listReports } from "@/lib/reports";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Archive — Signalbrief" };

export default async function ArchivePage() {
  const reports = await listReports();

  return (
    <AppChrome pathname="/archive">
      <div className="page-hero">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Archive
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">Past daily viral reports</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {reports.length === 0 ? (
          <p className="text-[var(--fog)]">No archived reports yet.</p>
        ) : (
          <ul className="saas-panel divide-y divide-[var(--line)] overflow-hidden">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/report/${r.reportDate}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-[var(--canvas)]"
                >
                  <span className="font-[family-name:var(--font-display)] text-lg">
                    {formatReportDate(r.reportDate)}
                  </span>
                  <span className="text-sm text-[var(--fog)]">{r.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppChrome>
  );
}
