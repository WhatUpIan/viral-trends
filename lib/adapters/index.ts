import { fetchInstagramMetaTrends } from "./instagram";
import { fetchRedditTrends } from "./reddit";
import { fetchTikTokTrends } from "./tiktok";
import { fetchXTrends } from "./x";
import { fetchYouTubeTrends } from "./youtube";
import { getCreatorCrawl } from "../creatorcrawl";
import { dedupeTrends } from "../normalize";
import type { TrendItem } from "../types";

export async function ingestAllPlatforms(): Promise<TrendItem[]> {
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

  return dedupeTrends(items);
}
