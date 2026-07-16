import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

const REEL_QUERIES = [
  "viral reel",
  "trending challenge",
  "product demo",
  "beauty tutorial",
  "fitness tip",
];

/** Instagram Reels + Meta short-form surface */
export async function fetchInstagramMetaTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const igItems: TrendItem[] = [];
  const metaItems: TrendItem[] = [];

  for (const query of REEL_QUERIES.slice(0, 3)) {
    try {
      const res = await cc.instagram.searchReels({ query });
      const posts = (res.data ?? []).slice(0, 5);
      posts.forEach((post, i) => {
        const ig = postToTrendItem(post, "instagram");
        if (ig) igItems.push(ig);
        // Alternate half into Meta Reels bucket for combined Meta surface
        if (i % 2 === 0) {
          const meta = postToTrendItem(post, "meta", {
            externalId: `meta-${post.id ?? post.url}`,
          });
          if (meta) metaItems.push(meta);
        }
      });
    } catch (err) {
      console.warn(`[instagram] searchReels "${query}" failed:`, err);
    }
  }

  return [...igItems, ...metaItems].slice(0, 24);
}
