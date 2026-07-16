import { TrendCard } from "./TrendCard";
import type { ReportTrend } from "@/lib/types";

type Props = {
  title: string;
  trends: ReportTrend[];
};

export function CategorySection({ title, trends }: Props) {
  if (trends.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--line)] pb-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)] sm:text-2xl">
          {title}
        </h2>
        <span className="text-sm tabular-nums text-[var(--fog)]">
          {trends.length} {trends.length === 1 ? "trend" : "trends"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trends.map((trend, i) => (
          <TrendCard key={trend.id} trend={trend} index={i} />
        ))}
      </div>
    </section>
  );
}
