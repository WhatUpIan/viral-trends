import { fetchInstagramMetaTrends } from "./instagram";
import { fetchRedditTrends } from "./reddit";
import { fetchTikTokTrends } from "./tiktok";
import { fetchXTrends } from "./x";
import { fetchYouTubeTrends } from "./youtube";
import { getCreatorCrawl } from "../creatorcrawl";
import { filterUsTrends } from "../locale-filter";
import { dedupeTrends } from "../normalize";
import { filterQualityTrends } from "../quality-filter";
import type { TrendItem } from "../types";

export type IngestStats = {
  fetched: number;
  songsFetched: number;
  afterUsFilter: number;
  afterQualityFilter: number;
  songsKept: number;
};

export async function ingestAllPlatforms(): Promise<{
  items: TrendItem[];
  stats: IngestStats;
}> {
  const cc = getCreatorCrawl();

  const results = await Promise.allSettled([
    fetchTikTokTrends(cc),
    fetchYouTubeTrends(cc),
    fetchInstagramMetaTrends(cc),
    fetchXTrends(cc),
    fetchRedditTrends(cc),
  ]);

  const items: TrendItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.warn("[ingest] platform adapter rejected:", result.reason);
    }
  }

  const isSound = (t: TrendItem) =>
    t.externalId.startsWith("song-") || t.externalId.startsWith("hashtag-");

  const deduped = dedupeTrends(items);
  const usOnly = filterUsTrends(deduped);
  const quality = filterQualityTrends(usOnly);

  const stats: IngestStats = {
    fetched: deduped.length,
    songsFetched: deduped.filter(isSound).length,
    afterUsFilter: usOnly.length,
    afterQualityFilter: quality.length,
    songsKept: quality.filter(isSound).length,
  };
  console.log("[ingest] stats:", JSON.stringify(stats));

  return { items: quality, stats };
}
