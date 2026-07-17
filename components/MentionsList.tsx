import type { BrandMention } from "@/lib/brands";
import { formatNumber } from "@/lib/format";
import Link from "next/link";

type Props = {
  mentions: BrandMention[];
  brandId: string;
  sourceFilter: "social" | "web" | null;
};

function sentimentBadge(sentiment: BrandMention["sentiment"]) {
  if (sentiment === "positive") return <span className="text-xs text-green-700">Positive</span>;
  if (sentiment === "negative") return <span className="text-xs text-[var(--heat)]">Negative</span>;
  return <span className="text-xs text-[var(--fog)]">Neutral</span>;
}

export function MentionsList({ mentions, brandId, sourceFilter }: Props) {
  const filtered = sourceFilter
    ? mentions.filter((m) => m.source === sourceFilter)
    : mentions;

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {[
          { id: null, label: "All" },
          { id: "social", label: "Social" },
          { id: "web", label: "Web & news" },
        ].map((f) => (
          <Link
            key={f.label}
            href={`/brands/${brandId}?tab=mentions${f.id ? `&source=${f.id}` : ""}`}
            className={`filter-chip ${sourceFilter === f.id ? "filter-chip-active" : ""}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
          <p className="mb-2 text-[var(--ink)]">No mentions yet</p>
          <p className="text-sm text-[var(--fog)]">
            The monitor runs every 6 hours. Mentions from social platforms, news, and the web will
            appear here as they&apos;re found.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
          {filtered.map((m) => (
            <li key={m.id} className="px-5 py-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="platform-badge">{m.platform ?? m.source}</span>
                {sentimentBadge(m.sentiment)}
                {m.matchedKeyword && (
                  <span className="text-xs text-[var(--fog)]">matched “{m.matchedKeyword}”</span>
                )}
                {m.publishedAt && (
                  <span className="ml-auto text-xs text-[var(--fog)]">
                    {new Date(m.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--ink)] underline-offset-2 hover:underline"
              >
                {m.title || m.url}
              </a>
              {m.snippet && m.snippet !== m.title && (
                <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-soft)]">{m.snippet}</p>
              )}
              <p className="mt-1 text-xs text-[var(--fog)]">
                {m.author && <>@{m.author} · </>}
                {m.metrics.views != null && <>{formatNumber(m.metrics.views)} views · </>}
                {m.metrics.likes != null && <>{formatNumber(m.metrics.likes)} likes · </>}
                {m.metrics.comments != null && <>{formatNumber(m.metrics.comments)} comments</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
