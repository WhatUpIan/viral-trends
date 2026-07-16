import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { YOUTUBE_CATEGORY_QUERIES } from "../category-queries";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

export async function fetchYouTubeTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  for (const [category, query] of YOUTUBE_CATEGORY_QUERIES) {
    try {
      const search = await cc.youtube.search({
        query,
        uploadDate: "week",
        sortBy: "relevance",
        filter: "short",
      });
      for (const post of (search.data ?? []).slice(0, 4)) {
        const item = postToTrendItem(post, "youtube", { categoryHint: category });
        if (item) items.push(item);
      }
    } catch (err) {
      console.warn(`[youtube] search "${query}" failed:`, err);
    }
  }

  try {
    const res = await cc.youtube.trendingShorts();
    for (const post of (res.data ?? []).slice(0, 6)) {
      const item = postToTrendItem(post, "youtube");
      if (item) items.push(item);
    }
  } catch (err) {
    console.warn("[youtube] trendingShorts failed:", err);
  }

  return items.slice(0, 30);
}
