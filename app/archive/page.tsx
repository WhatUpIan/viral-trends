import Link from "next/link";
import { formatReportDate } from "@/lib/format";
import { listReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const reports = await listReports();

  return (
    <main className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-10 text-[var(--paper)] sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
            ← Signalbrief
          </Link>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Archive
          </h1>
          <p className="mt-2 text-[var(--paper-muted)]">Past daily viral reports</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        {reports.length === 0 ? (
          <p className="text-[var(--fog)]">No archived reports yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/report/${r.reportDate}`}
                  className="flex items-center justify-between py-4 transition hover:bg-[var(--paper-soft)]"
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
    </main>
  );
}
