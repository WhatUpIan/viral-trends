import { formatNumber, platformLabel } from "@/lib/format";
import type { ReportTrend } from "@/lib/types";
import { ProxiedThumb } from "./ProxiedThumb";

type Props = {
  trend: ReportTrend;
  index: number;
};

export function TrendCard({ trend, index }: Props) {
  return (
    <article
      className="trend-card group"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <a
        href={trend.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--paper-soft)]">
          <ProxiedThumb
            src={trend.thumbnailUrl}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="heat-badge absolute left-2 top-2">{trend.heatScore}</span>
          <span className="platform-badge absolute bottom-2 left-2">
            {platformLabel(trend.platform)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--fog)]">
            {trend.category}
          </p>
          <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm leading-snug text-[var(--ink)] sm:text-base">
            {trend.title}
          </h3>
          {trend.creatorHandle && (
            <p className="truncate text-xs text-[var(--fog)]">@{trend.creatorHandle}</p>
          )}
          <div className="mt-auto flex flex-wrap gap-x-2 gap-y-0.5 pt-1 text-[11px] text-[var(--fog)]">
            {trend.metrics.views != null && (
              <span>{formatNumber(trend.metrics.views)} views</span>
            )}
            {trend.metrics.likes != null && (
              <span>{formatNumber(trend.metrics.likes)} likes</span>
            )}
          </div>
          {trend.insight && (
            <p className="line-clamp-2 border-t border-[var(--line)] pt-2 text-[11px] leading-snug text-[var(--ink-soft)]">
              {trend.insight}
            </p>
          )}
        </div>
      </a>
    </article>
  );
}
