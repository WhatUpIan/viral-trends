import { setMentionFlag } from "@/app/brands/actions";
import { FlagBar } from "@/components/FlagBar";
import { LocalTime } from "@/components/LocalTime";
import type { BrandMention } from "@/lib/brands";
import { formatNumber } from "@/lib/format";
import Link from "next/link";

type Props = {
  mentions: BrandMention[];
  brandId: string;
  platformFilter: string | null;
  flagFilter: "highlighted" | "unviewed" | null;
};

function sentimentBadge(sentiment: BrandMention["sentiment"]) {
  if (sentiment === "positive") return <span className="text-xs text-green-700">Positive</span>;
  if (sentiment === "negative") return <span className="text-xs text-[var(--heat)]">Negative</span>;
  return <span className="text-xs text-[var(--fog)]">Neutral</span>;
}

export function MentionsList({ mentions, brandId, platformFilter, flagFilter }: Props) {
  let filtered = platformFilter
    ? mentions.filter((m) => (m.platform ?? m.source) === platformFilter)
    : mentions;
  if (flagFilter === "highlighted") filtered = filtered.filter((m) => m.highlighted);
  if (flagFilter === "unviewed") filtered = filtered.filter((m) => !m.viewed);

  // Newest first (published, else discovered)
  filtered = [...filtered].sort((a, b) => {
    const ta = Date.parse(a.publishedAt ?? a.createdAt) || 0;
    const tb = Date.parse(b.publishedAt ?? b.createdAt) || 0;
    return tb - ta;
  });

  const base = `/brands/${brandId}`;
  const withPlatform = platformFilter ? `&platform=${platformFilter}` : "";
  const withFlag = flagFilter ? `&flag=${flagFilter}` : "";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            {platformFilter
              ? platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)
              : "All platforms"}
          </h2>
          <p className="text-sm text-[var(--fog)]">
            {filtered.length} mention{filtered.length === 1 ? "" : "s"} · newest first
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "unviewed" as const, label: "Unviewed" },
            { id: "highlighted" as const, label: "Highlighted" },
          ].map((f) => (
            <Link
              key={f.id}
              href={`${base}?tab=mentions${withPlatform}${flagFilter === f.id ? "" : `&flag=${f.id}`}`}
              className={`filter-chip ${flagFilter === f.id ? "filter-chip-active" : ""}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[var(--line)] bg-white px-6 py-14 text-center">
          <p className="mb-2 text-[var(--ink)]">No mentions here</p>
          <p className="text-sm text-[var(--fog)]">
            {flagFilter || platformFilter
              ? "Nothing matches these filters yet."
              : "Use Run monitoring to scan social and the web."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
          {filtered.map((m) => (
            <li
              key={m.id}
              className={`px-5 py-4 ${m.highlighted ? "mention-highlighted" : ""} ${
                m.viewed && !m.highlighted ? "mention-viewed" : ""
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="platform-badge">{m.platform ?? m.source}</span>
                {sentimentBadge(m.sentiment)}
                {m.matchedKeyword && (
                  <span className="text-xs text-[var(--fog)]">matched “{m.matchedKeyword}”</span>
                )}
                <span className="ml-auto text-xs text-[var(--fog)]">
                  {m.publishedAt ? (
                    <>
                      Posted <LocalTime iso={m.publishedAt} />
                    </>
                  ) : (
                    <>
                      Found <LocalTime iso={m.createdAt} />
                    </>
                  )}
                </span>
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
                {m.metrics.comments != null && <>{formatNumber(m.metrics.comments)} comments · </>}
                {m.publishedAt && (
                  <>
                    found <LocalTime iso={m.createdAt} />
                  </>
                )}
              </p>
              <FlagBar
                flags={{ viewed: m.viewed, responded: m.responded, highlighted: m.highlighted }}
                onToggle={setMentionFlag.bind(null, brandId, m.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
