import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { INSTAGRAM_CATEGORY_QUERIES } from "../category-queries";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

/** Instagram / Meta Reels — remake-focused US English queries per category */
export async function fetchInstagramMetaTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  const results = await Promise.allSettled(
    INSTAGRAM_CATEGORY_QUERIES.map(async ([category, query]) => {
      const res = await cc.instagram.searchReels({ query });
      const out: TrendItem[] = [];
      (res.data ?? []).slice(0, 6).forEach((post, i) => {
        const ig = postToTrendItem(post, "instagram", { categoryHint: category });
        if (ig) out.push(ig);
        // Alternate half into the Meta Reels surface
        if (i % 2 === 0) {
          const meta = postToTrendItem(post, "meta", {
            externalId: `meta-${post.id ?? post.url}`,
            categoryHint: category,
          });
          if (meta) out.push(meta);
        }
      });
      return out;
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") items.push(...result.value);
    else console.warn("[instagram] searchReels failed:", result.reason);
  }

  return items.slice(0, 45);
}
