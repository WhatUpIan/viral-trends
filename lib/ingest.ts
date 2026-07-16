import { ingestAllPlatforms } from "./adapters";
import { classifyTrends, generateReportSummary } from "./classify";
import { isCreatorCrawlConfigured } from "./creatorcrawl";
import {
  getTodayDateString,
  markReportFailed,
  persistDailyReport,
} from "./reports";
import { scoreAndRank } from "./score";
import { isSupabaseConfigured } from "./supabase";
import type { Category, ClassifiedTrend } from "./types";

const MAX_PER_CATEGORY = 5;
const MAX_TOTAL = 36;

/** Cap each category so one bucket (e.g. Sounds & Audio) can't flood the report. */
function balanceCategories(trends: ClassifiedTrend[]): ClassifiedTrend[] {
  const sorted = [...trends].sort((a, b) => b.heatScore - a.heatScore);
  const counts = new Map<Category, number>();
  const out: ClassifiedTrend[] = [];
  for (const trend of sorted) {
    const used = counts.get(trend.category) ?? 0;
    if (used >= MAX_PER_CATEGORY) continue;
    counts.set(trend.category, used + 1);
    out.push(trend);
    if (out.length >= MAX_TOTAL) break;
  }
  return out;
}

export type IngestResult = {
  ok: boolean;
  reportDate: string;
  trendCount: number;
  reportId?: string;
  error?: string;
  usedMock?: boolean;
};

export async function runDailyIngest(reportDate = getTodayDateString()): Promise<IngestResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reportDate,
      trendCount: 0,
      error: "Supabase is not configured",
    };
  }

  if (!isCreatorCrawlConfigured()) {
    return {
      ok: false,
      reportDate,
      trendCount: 0,
      error: "CREATORCRAWL_API_KEY is not set",
    };
  }

  try {
    const { items: raw } = await ingestAllPlatforms();
    // Reserve slots for trending sounds/hashtags so 100-heat search posts
    // can't crowd them out of the report entirely.
    const ranked = scoreAndRank(raw);
    const isSoundOrTag = (id: string) =>
      id.startsWith("song-") || id.startsWith("hashtag-");
    const sounds = ranked.filter((t) => isSoundOrTag(t.externalId)).slice(0, 8);
    const rest = ranked
      .filter((t) => !isSoundOrTag(t.externalId))
      .slice(0, 40 - sounds.length);
    const scored = [...sounds, ...rest].sort((a, b) => b.heatScore - a.heatScore);
    const classified = balanceCategories(await classifyTrends(scored));
    const summary = await generateReportSummary(classified);

    const { reportId } = await persistDailyReport({
      reportDate,
      summary,
      trends: classified.map((t) => ({
        platform: t.platform,
        externalId: t.externalId,
        title: t.title,
        url: t.url,
        thumbnailUrl: t.thumbnailUrl,
        creatorHandle: t.creatorHandle,
        metrics: t.metrics,
        heatScore: t.heatScore,
        category: t.category,
        insight: t.insight,
        soundOrFormat: t.soundOrFormat,
        raw: t.raw,
      })),
    });

    return {
      ok: true,
      reportDate,
      trendCount: classified.length,
      reportId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    await markReportFailed(reportDate, message);
    return {
      ok: false,
      reportDate,
      trendCount: 0,
      error: message,
    };
  }
}
