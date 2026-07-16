import type { ScoredTrend, TrendItem } from "./types";

/**
 * Heat score 0–100 from engagement volume + recency.
 * Tuned for short-form: views dominate, shares/comments boost velocity signal.
 */
export function scoreTrend(item: TrendItem, now = Date.now()): ScoredTrend {
  const { views = 0, likes = 0, comments = 0, shares = 0 } = item.metrics;

  const engagement =
    Math.log10(views + 1) * 18 +
    Math.log10(likes + 1) * 10 +
    Math.log10(comments + 1) * 8 +
    Math.log10(shares + 1) * 12;

  let recencyBoost = 0;
  if (item.publishedAt) {
    const ageHours =
      (now - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 12) recencyBoost = 18;
    else if (ageHours < 24) recencyBoost = 14;
    else if (ageHours < 48) recencyBoost = 10;
    else if (ageHours < 72) recencyBoost = 6;
    else if (ageHours < 168) recencyBoost = 3;
  } else {
    recencyBoost = 5;
  }

  const heatScore = Math.min(100, Math.round(engagement + recencyBoost));

  return { ...item, heatScore };
}

export function scoreAndRank(items: TrendItem[]): ScoredTrend[] {
  return items
    .map((item) => scoreTrend(item))
    .sort((a, b) => b.heatScore - a.heatScore);
}
