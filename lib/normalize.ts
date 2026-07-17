import type { Post } from "@creatorcrawl/sdk";
import type { Platform, TrendItem, TrendMetrics } from "./types";

function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

function resolveThumbnail(post: Post, platform: Platform): string | undefined {
  const fromMedia =
    post.media?.find((m) => m.thumbnail_url)?.thumbnail_url ??
    post.media?.find((m) => m.type === "image")?.url ??
    post.media?.[0]?.url ??
    undefined;

  if (platform === "youtube" && post.url) {
    const id = youtubeIdFromUrl(post.url) ?? (post.id && !String(post.id).includes("http") ? String(post.id) : null);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  return fromMedia;
}

export function postToTrendItem(
  post: Post,
  platform: Platform,
  overrides?: Partial<TrendItem>,
): TrendItem | null {
  const id = post.id ?? post.url;
  if (!id || !post.url) return null;

  const metrics: TrendMetrics = {
    views: post.view_count ?? undefined,
    likes: post.like_count ?? undefined,
    comments: post.comment_count ?? undefined,
    shares: post.share_count ?? undefined,
  };

  const soundOrFormat = post.music
    ? `${post.music.title}${post.music.author ? ` — ${post.music.author}` : ""}`
    : undefined;

  return {
    platform,
    externalId: String(id),
    title: (post.text || "Untitled").slice(0, 160),
    url: post.url,
    thumbnailUrl: resolveThumbnail(post, platform),
    creatorHandle: post.author?.handle ?? undefined,
    metrics,
    publishedAt: post.created_at ?? undefined,
    soundOrFormat,
    raw: post,
    ...overrides,
  };
}

export function dedupeTrends(items: TrendItem[]): TrendItem[] {
  const seen = new Set<string>();
  const out: TrendItem[] = [];
  for (const item of items) {
    const key = `${item.platform}:${item.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
