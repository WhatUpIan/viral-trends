import type { Category } from "./types";

/**
 * Remake-oriented US search seeds per category.
 * Each entry costs 1 CreatorCrawl credit per platform search, so keep lists tight.
 */
export const TIKTOK_CATEGORY_QUERIES: [Category, string][] = [
  ["Formats & Challenges", "POV challenge trend"],
  ["Memes & Humor", "comedy skit trend"],
  ["Products & Brands", "amazon finds haul"],
  ["Beauty & Fashion", "makeup tutorial trend"],
  ["Fitness & Wellness", "gym challenge trend"],
  ["Food & Drink", "easy recipe hack"],
  ["Tech & Gaming", "AI tool demo"],
];

export const YOUTUBE_CATEGORY_QUERIES: [Category, string][] = [
  ["Formats & Challenges", "POV shorts trend"],
  ["Memes & Humor", "funny skit shorts"],
  ["Products & Brands", "product review shorts"],
  ["Beauty & Fashion", "GRWM makeup shorts"],
  ["Fitness & Wellness", "workout challenge shorts"],
  ["Food & Drink", "recipe hack shorts"],
  ["Tech & Gaming", "tech gadget shorts"],
];

export const INSTAGRAM_CATEGORY_QUERIES: [Category, string][] = [
  ["Formats & Challenges", "POV reel trend"],
  ["Beauty & Fashion", "GRWM beauty reel"],
  ["Products & Brands", "product demo reel"],
  ["Fitness & Wellness", "fitness challenge reel"],
  ["Food & Drink", "recipe reel trend"],
  ["Memes & Humor", "funny couple skit reel"],
];
