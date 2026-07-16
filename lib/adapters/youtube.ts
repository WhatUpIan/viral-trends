import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

export async function fetchYouTubeTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  try {
    const res = await cc.youtube.trendingShorts();
    for (const post of res.data ?? []) {
      const item = postToTrendItem(post, "youtube");
      if (item) items.push(item);
    }
  } catch (err) {
    console.warn("[youtube] trendingShorts failed:", err);
  }

  try {
    const search = await cc.youtube.search({
      query: "shorts viral",
      uploadDate: "today",
      sortBy: "view_count",
      filter: "short",
    });
    for (const post of (search.data ?? []).slice(0, 10)) {
      const item = postToTrendItem(post, "youtube");
      if (item) items.push(item);
    }
  } catch (err) {
    console.warn("[youtube] search failed:", err);
  }

  return items.slice(0, 20);
}
