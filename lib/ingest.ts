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
    const raw = await ingestAllPlatforms();
    const scored = scoreAndRank(raw).slice(0, 50);
    const classified = await classifyTrends(scored);
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
