import type { BrandHealth } from "@/lib/brand-insights";

export function BrandHealthStrip({ health }: { health: BrandHealth }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Overall Health" value={health.score > 0 ? String(health.score) : "—"} />
        <Stat label="Sentiment" value={health.sentimentLabel} />
        <Stat
          label="Share of Voice"
          value={health.shareOfVoice !== null ? `${health.shareOfVoice}%` : "—"}
          hint={health.shareOfVoice === null ? "Need competitors" : "Estimate"}
        />
        <Stat label="Competitors" value={String(health.competitorCount)} />
        <Stat label="Avg Daily Mentions" value={String(health.avgDailyMentions)} />
        <Stat label="Unread" value={String(health.unread)} />
      </div>

      {health.insight && (
        <p className="border-l-2 border-[var(--ink)] bg-white py-3 pl-4 pr-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {health.insight}
        </p>
      )}

      {health.growingTopics.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
            Growing topics
          </p>
          <div className="flex flex-wrap gap-2">
            {health.growingTopics.map((t) => (
              <span key={t} className="keyword-pill">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {health.competitorNames.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
            Competitors
          </p>
          <p className="text-sm text-[var(--ink-soft)]">{health.competitorNames.join(" · ")}</p>
        </div>
      )}

      {health.shareOfVoice === null && (
        <p className="text-xs text-[var(--fog)]">{health.shareOfVoiceNote}</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-[var(--line)] bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--fog)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
        {value}
      </p>
      {hint && <p className="text-[10px] text-[var(--fog)]">{hint}</p>}
    </div>
  );
}
