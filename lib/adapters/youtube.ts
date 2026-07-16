import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

const REMAKE_QUERIES = [
  "POV shorts trend",
  "GRWM shorts",
  "before after shorts hack",
  "product demo shorts",
];

export async function fetchYouTubeTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  for (const query of REMAKE_QUERIES) {
    try {
      const search = await cc.youtube.search({
        query,
        uploadDate: "week",
        sortBy: "relevance",
        filter: "short",
      });
      for (const post of (search.data ?? []).slice(0, 5)) {
        const item = postToTrendItem(post, "youtube");
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

  return items.slice(0, 18);
}
