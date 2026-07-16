import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

const REEL_QUERIES = [
  "US trending reel",
  "American beauty tutorial",
  "US fitness challenge",
];

/** Instagram Reels + Meta short-form surface (US-biased queries) */
export async function fetchInstagramMetaTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const igItems: TrendItem[] = [];
  const metaItems: TrendItem[] = [];

  for (const query of REEL_QUERIES) {
    try {
      const res = await cc.instagram.searchReels({ query });
      const posts = (res.data ?? []).slice(0, 5);
      posts.forEach((post, i) => {
        const ig = postToTrendItem(post, "instagram");
        if (ig) igItems.push(ig);
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
