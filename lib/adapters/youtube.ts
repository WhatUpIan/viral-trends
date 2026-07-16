import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { YOUTUBE_CATEGORY_QUERIES } from "../category-queries";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

export async function fetchYouTubeTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  const tasks: Promise<TrendItem[]>[] = YOUTUBE_CATEGORY_QUERIES.map(
    async ([category, query]) => {
      const search = await cc.youtube.search({
        query,
        uploadDate: "week",
        sortBy: "relevance",
        filter: "short",
      });
      return (search.data ?? [])
        .slice(0, 4)
        .map((post) => postToTrendItem(post, "youtube", { categoryHint: category }))
        .filter((item): item is TrendItem => item !== null);
    },
  );

  tasks.push(
    (async () => {
      const res = await cc.youtube.trendingShorts();
      return (res.data ?? [])
        .slice(0, 6)
        .map((post) => postToTrendItem(post, "youtube"))
        .filter((item): item is TrendItem => item !== null);
    })(),
  );

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "fulfilled") items.push(...result.value);
    else console.warn("[youtube] fetch failed:", result.reason);
  }

  return items.slice(0, 30);
}
