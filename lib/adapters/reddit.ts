import type { CreatorCrawl } from "@creatorcrawl/sdk";
import { isVideoPost } from "./tiktok";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

const SUBREDDITS = ["videos", "tiktokcringe", "interestingasfuck", "nextfuckinglevel"];

export async function fetchRedditTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  for (const subreddit of SUBREDDITS.slice(0, 3)) {
    try {
      const res = await cc.reddit.subredditPosts({
        subreddit,
        sort: "hot",
        timeframe: "day",
      });

      const posts = (res.data ?? [])
        .filter((p) => isVideoPost(p) || Boolean(p.url?.match(/v\.redd\.it|youtu|tiktok|instagram/i)))
        .slice(0, 6);

      for (const post of posts) {
        const item = postToTrendItem(post, "reddit", {
          creatorHandle: post.author?.handle
            ? `u/${post.author.handle}`
            : `r/${subreddit}`,
        });
        if (item) items.push(item);
      }
    } catch (err) {
      console.warn(`[reddit] r/${subreddit} failed:`, err);
    }
  }

  return items.slice(0, 15);
}
