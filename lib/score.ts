import { remakeBoost } from "./quality-filter";
import type { ScoredTrend, TrendItem } from "./types";

/**
 * Heat score 0–100: engagement + recency + remake value for brands/creators.
 * Sounds/hashtags/formats rank above raw FYP view-count slop.
 */
export function scoreTrend(item: TrendItem, now = Date.now()): ScoredTrend {
  const { views = 0, likes = 0, comments = 0, shares = 0 } = item.metrics;

  const engagement =
    Math.log10(views + 1) * 14 +
    Math.log10(likes + 1) * 8 +
    Math.log10(comments + 1) * 7 +
    Math.log10(shares + 1) * 10;

  let recencyBoost = 0;
  if (item.publishedAt) {
    const ageHours =
      (now - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 12) recencyBoost = 16;
    else if (ageHours < 24) recencyBoost = 12;
    else if (ageHours < 48) recencyBoost = 9;
    else if (ageHours < 72) recencyBoost = 5;
    else if (ageHours < 168) recencyBoost = 2;
  } else if (item.externalId.startsWith("song-") || item.externalId.startsWith("hashtag-")) {
    recencyBoost = 10;
  } else {
    recencyBoost = 3;
  }

  const heatScore = Math.min(
    100,
    Math.round(engagement + recencyBoost + remakeBoost(item)),
  );

  return { ...item, heatScore };
}

export function scoreAndRank(items: TrendItem[]): ScoredTrend[] {
  return items
    .map((item) => scoreTrend(item))
    .sort((a, b) => b.heatScore - a.heatScore);
}
