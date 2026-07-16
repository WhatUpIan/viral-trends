import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { INSTAGRAM_CATEGORY_QUERIES } from "../category-queries";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

/** Instagram / Meta Reels — remake-focused US English queries per category */
export async function fetchInstagramMetaTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  for (const [category, query] of INSTAGRAM_CATEGORY_QUERIES) {
    try {
      const res = await cc.instagram.searchReels({ query });
      (res.data ?? []).slice(0, 4).forEach((post, i) => {
        const ig = postToTrendItem(post, "instagram", { categoryHint: category });
        if (ig) items.push(ig);
        // Alternate half into the Meta Reels surface
        if (i % 2 === 0) {
          const meta = postToTrendItem(post, "meta", {
            externalId: `meta-${post.id ?? post.url}`,
            categoryHint: category,
          });
          if (meta) items.push(meta);
        }
      });
    } catch (err) {
      console.warn(`[instagram] searchReels "${query}" failed:`, err);
    }
  }

  return items.slice(0, 30);
}
