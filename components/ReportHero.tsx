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
      <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
        <nav className="mb-10 flex items-center justify-between text-sm">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--paper)]"
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

        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
          Daily viral report · {formatReportDate(reportDate)}
        </p>

        <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-tight text-[var(--paper)] sm:text-6xl">
          Signalbrief
        </h1>

        <p className="mt-4 max-w-xl text-lg text-[var(--paper-muted)] sm:text-xl">
          What&apos;s rising today across short-form — so marketers and creators act before the peak.
        </p>

        {summary && (
          <p className="mt-8 max-w-2xl border-l-2 border-[var(--accent)] pl-4 text-base leading-relaxed text-[var(--paper-soft)]">
            {summary}
          </p>
        )}

        <p className="mt-6 text-sm text-[var(--paper-muted)]">
          {trendCount} ranked signals · heat scored 0–100
        </p>
      </div>
    </header>
  );
}
