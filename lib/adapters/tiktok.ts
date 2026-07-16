import type { CreatorCrawl, Post } from "@creatorcrawl/sdk";
import { postToTrendItem } from "../normalize";
import type { TrendItem } from "../types";

/** US searches aimed at remakeable formats — not random FYP clips */
const FORMAT_QUERIES = [
  "POV challenge US",
  "GRWM trend",
  "transition trend TikTok",
  "before after hack",
];

export async function fetchTikTokTrends(cc: CreatorCrawl): Promise<TrendItem[]> {
  const items: TrendItem[] = [];

  // Sounds first — highest remake value for brands/creators
  try {
    const songs = await cc.tiktok.popularSongs({
      timePeriod: "7",
      countryCode: "US",
      rankType: "popular",
    });
    for (const song of (songs.data ?? []).slice(0, 12)) {
      items.push({
        platform: "tiktok",
        externalId: `song-${song.id}`,
        title: `Trending sound: ${song.title}`,
        url: song.url ?? `https://www.tiktok.com/music/${song.id}`,
        thumbnailUrl: song.cover_url ?? undefined,
        creatorHandle: song.author || undefined,
        metrics: { views: song.use_count ?? undefined },
        soundOrFormat: `${song.title} — ${song.author}`,
        raw: song,
      });
    }
  } catch (err) {
    console.warn("[tiktok] popularSongs failed:", err);
  }

  try {
    const tags = await cc.tiktok.popularHashtags({ period: "7", countryCode: "US" });
    for (const tag of (tags.data ?? []).slice(0, 10)) {
      const name = tag.name?.toLowerCase() ?? "";
      if (/^(fyp|foryou|viral|trending|xyzbca|foryoupage)$/i.test(name)) continue;
      items.push({
        platform: "tiktok",
        externalId: `hashtag-${tag.name}`,
        title: `#${tag.name}`,
        url: tag.url ?? `https://www.tiktok.com/tag/${encodeURIComponent(tag.name)}`,
        metrics: {
          views: tag.view_count ?? undefined,
          likes: tag.post_count ?? undefined,
        },
        soundOrFormat: `Hashtag · ${tag.name}`,
        raw: tag,
      });
    }
  } catch (err) {
    console.warn("[tiktok] popularHashtags failed:", err);
  }

  // Targeted format searches (US region) instead of raw FYP dump
  for (const query of FORMAT_QUERIES) {
    try {
      const res = await cc.tiktok.searchKeyword({
        query,
        region: "US",
        sort_by: "relevance",
        date_posted: "this_week",
      });
      for (const post of (res.data ?? []).slice(0, 4)) {
        const item = postToTrendItem(post, "tiktok");
        if (item) items.push(item);
      }
    } catch (err) {
      console.warn(`[tiktok] searchKeyword "${query}" failed:`, err);
    }
  }

  // Small sample of US popular videos — quality filter will cull slop
  try {
    const popular = await cc.tiktok.popularVideos({ period: "7", countryCode: "US" });
    for (const post of (popular.data ?? []).slice(0, 8)) {
      const item = postToTrendItem(post, "tiktok");
      if (item) items.push(item);
    }
  } catch (err) {
    console.warn("[tiktok] popularVideos failed:", err);
  }

  return items.slice(0, 40);
}

export function isVideoPost(post: Post): boolean {
  if (post.type === "video" || post.type === "reel" || post.type === "short") return true;
  return Boolean(post.media?.some((m) => m.type === "video" || m.type === "gif"));
}
