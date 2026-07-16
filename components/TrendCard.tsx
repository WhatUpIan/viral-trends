import { formatNumber, platformLabel } from "@/lib/format";
import type { ReportTrend } from "@/lib/types";

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
        className="flex gap-4 sm:gap-5"
      >
        <div className="relative h-28 w-20 shrink-0 overflow-hidden bg-[var(--ink-muted)] sm:h-36 sm:w-28">
          {trend.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trend.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--fog)]">
              No thumb
            </div>
          )}
          <span className="heat-badge absolute left-1.5 top-1.5">
            {trend.heatScore}
          </span>
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="platform-badge">{platformLabel(trend.platform)}</span>
            <span className="text-[11px] uppercase tracking-wider text-[var(--fog)]">
              {trend.category}
            </span>
          </div>

          <h3 className="font-[family-name:var(--font-display)] text-base leading-snug text-[var(--ink)] sm:text-lg">
            {trend.title}
          </h3>

          {trend.creatorHandle && (
            <p className="mt-1 text-sm text-[var(--fog)]">@{trend.creatorHandle}</p>
          )}

          {trend.soundOrFormat && (
            <p className="mt-1 text-sm text-[var(--accent)]">♪ {trend.soundOrFormat}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--fog)]">
            {trend.metrics.views != null && (
              <span>{formatNumber(trend.metrics.views)} views</span>
            )}
            {trend.metrics.likes != null && (
              <span>{formatNumber(trend.metrics.likes)} likes</span>
            )}
            {trend.metrics.comments != null && (
              <span>{formatNumber(trend.metrics.comments)} comments</span>
            )}
            {trend.metrics.shares != null && (
              <span>{formatNumber(trend.metrics.shares)} shares</span>
            )}
          </div>

          {trend.insight && (
            <p className="mt-3 border-l-2 border-[var(--accent)] pl-3 text-sm leading-relaxed text-[var(--ink-soft)]">
              <span className="font-medium text-[var(--ink)]">Why act now — </span>
              {trend.insight}
            </p>
          )}
        </div>
      </a>
    </article>
  );
}
