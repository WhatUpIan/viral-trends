import { formatReportDate } from "@/lib/format";
import Link from "next/link";

type Props = {
  reportDate: string;
  summary: string | null;
  trendCount: number;
};

export function ReportHero({ reportDate, summary, trendCount }: Props) {
  return (
    <header className="report-hero relative overflow-hidden">
      <div className="hero-grid absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 py-5 sm:px-8 sm:py-6">
        <nav className="mb-4 flex items-center justify-between text-sm">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-base tracking-tight text-[var(--paper)]"
          >
            Signalbrief
          </Link>
          <div className="flex gap-5 text-[var(--paper-muted)]">
            <Link href="/about" className="transition hover:text-[var(--paper)]">
              About
            </Link>
            <Link href="/archive" className="transition hover:text-[var(--paper)]">
              Archive
            </Link>
          </div>
        </nav>

        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          US daily · {formatReportDate(reportDate)}
        </p>

        <h1 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--paper)] sm:text-2xl">
          What&apos;s rising today
        </h1>

        <p className="mt-1 max-w-xl text-sm text-[var(--paper-muted)]">
          US remake-ready sounds, formats, and challenges — for brands and creators.
        </p>

        {summary && (
          <p className="mt-3 max-w-2xl border-l-2 border-[var(--accent)] pl-3 text-sm leading-snug text-[var(--paper-soft)]">
            {summary}
          </p>
        )}

        <p className="mt-2 text-xs text-[var(--paper-muted)]">
          {trendCount} ranked signals · heat 0–100
        </p>
      </div>
    </header>
  );
}
