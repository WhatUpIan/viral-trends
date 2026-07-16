import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { isVideoPost } from "./tiktok";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

/** US culture / creator-economy accounts — not random global clips */
const SIGNAL_HANDLES = ["SocialMediaToday", "Later", "Hootsuite", "Buffer"];

export async function fetchXTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  for (const handle of SIGNAL_HANDLES.slice(0, 2)) {
    try {
      const res = await cc.twitter.userTweets({ handle });
      const posts = (res.data ?? [])
        .filter(isVideoPost)
        .sort(
          (a, b) =>
            (b.like_count ?? 0) + (b.view_count ?? 0) - ((a.like_count ?? 0) + (a.view_count ?? 0)),
        )
        .slice(0, 3);

      for (const post of posts) {
        const item = postToTrendItem(post, "x");
        if (item) items.push(item);
      }
    } catch (err) {
      console.warn(`[x] userTweets @${handle} failed:`, err);
    }
  }

  return items.slice(0, 6);
}
