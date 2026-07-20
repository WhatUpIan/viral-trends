import { AppChrome } from "@/components/AppChrome";
import { TrendCard } from "@/components/TrendCard";
import { formatReportDate } from "@/lib/format";
import { getLatestReport } from "@/lib/latest-report";
import type { Category } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Memes — Signalbrief" };

const MEME_CATEGORIES: Category[] = ["Memes & Humor", "Formats & Challenges"];

export default async function MemesPage() {
  const report = await getLatestReport();
  const memes =
    report?.trends
      .filter((t) => MEME_CATEGORIES.includes(t.category))
      .sort((a, b) => b.heatScore - a.heatScore) ?? [];

  return (
    <AppChrome pathname="/memes">
      <div className="page-hero">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Culture
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Memes
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--fog)]">
            Humor, formats, and challenges rising in the US short-form feed
            {report ? ` · ${formatReportDate(report.reportDate)}` : ""}.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!report || memes.length === 0 ? (
          <div className="saas-panel px-6 py-14 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl">No memes in this report</p>
            <p className="mt-2 text-sm text-[var(--fog)]">
              Memes pull from Memes &amp; Humor and Formats &amp; Challenges in today’s ingest.
            </p>
            <Link href="/" className="btn-secondary mt-6 inline-block">
              Back to Trends
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {memes.map((t, i) => (
              <TrendCard key={t.id} trend={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </AppChrome>
  );
}
