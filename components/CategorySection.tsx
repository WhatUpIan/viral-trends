import { TrendCard } from "./TrendCard";
import type { ReportTrend } from "@/lib/types";

type Props = {
  title: string;
  trends: ReportTrend[];
};

export function CategorySection({ title, trends }: Props) {
  if (trends.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--line)] pb-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)] sm:text-3xl">
          {title}
        </h2>
        <span className="text-sm tabular-nums text-[var(--fog)]">
          {trends.length} {trends.length === 1 ? "trend" : "trends"}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {trends.map((trend, i) => (
          <TrendCard key={trend.id} trend={trend} index={i} />
        ))}
      </div>
    </section>
  );
}
