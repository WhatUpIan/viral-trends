import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

const REEL_QUERIES = [
  "POV reel trend",
  "GRWM beauty reel",
  "product demo reel",
  "transition outfit reel",
];

/** Instagram / Meta Reels — remake-focused US English queries */
export async function fetchInstagramMetaTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  for (const query of REEL_QUERIES) {
    try {
      const res = await cc.instagram.searchReels({ query });
      for (const post of (res.data ?? []).slice(0, 4)) {
        const ig = postToTrendItem(post, "instagram");
        if (ig) items.push(ig);
        const meta = postToTrendItem(post, "meta", {
          externalId: `meta-${post.id ?? post.url}`,
        });
        if (meta) items.push(meta);
      }
    } catch (err) {
      console.warn(`[instagram] searchReels "${query}" failed:`, err);
    }
  }

  return items.slice(0, 20);
}
