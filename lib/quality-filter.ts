import type { TrendItem } from "./types";

/** Romanized Hindi / South Asian caption patterns that slip past script detection */
const ROMANIZED_NON_EN =
  /\b(hai|hain|nahi|kya|kyu|kyun|acha|accha|bahut|mera|meri|tum|aap|bhai|didi|yaar|dil|pyar|pyaar|shadi|shaadi|rehman|allah|namaste|ji\b|ly lo|le lo|dekh|dekho|batao|sunao|sweety|sweetpari)\b/i;

/** Generic engagement-bait / non-remakeable spam */
const SLOP_PATTERNS =
  /#foryou\b|#fyp\b|#viral\b|#virl_video\b|#xyzbca\b|#foryoupage\b|#trending\b|#blowthisup\b|#goviral\b|#like\b|#follow\b|#followme\b|#likeforlike\b|#creatorsearchinsight/i;

const REMAKE_SIGNALS =
  /\b(pov|grwm|get ready with me|transition|before.?after|day in my life|routine|challenge|duet|stitch|tutorial|hack|recipe|haul|unbox|review|outfit|glow.?up|storytime| greente?xt| greenscreen|template|sound|audio|trend|format|demo|vs\.?|versus|ranking|tier list|myth|tested|tried)\b/i;

/** Self-promo / agency / sponsored ads masquerading as trends */
const SELF_PROMO_PATTERNS =
  /\b(dm me|dm us|link in bio|comment ["']?\w+["']? (and|to) (i'?ll|get|receive)|in need of (premium|professional)|hire (me|us)|my (agency|services)|book a call|free (guide|template|course) in bio|follow for more|want over \d+ hook|boost(s)? (your )?sales|use this free tool|stop (wasting|paying)|helps you (boost|scale|grow))\b|#\w*partner\b|#ad\b|#sponsored\b/i;

const GENERIC_ONLY_HASHTAGS = /^(\s*#[\w.]+\s*)+$/;

function hashtagSpamRatio(title: string): number {
  const tags = title.match(/#[\w.]+/g) ?? [];
  const words = title.replace(/#[\w.]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (tags.length === 0) return 0;
  if (words.length === 0) return 1;
  return tags.length / (tags.length + words.length);
}

function isRemakeSignal(item: TrendItem): boolean {
  if (item.externalId.startsWith("song-") || item.externalId.startsWith("hashtag-")) {
    return true;
  }
  // Sourced by a category-targeted remake query
  if (item.categoryHint) return true;
  if (item.soundOrFormat && /sound|audio|music|hashtag|♪/i.test(item.soundOrFormat)) {
    return true;
  }
  const text = `${item.title} ${item.soundOrFormat ?? ""}`;
  return REMAKE_SIGNALS.test(text);
}

function isSlop(item: TrendItem): boolean {
  const title = item.title?.trim() ?? "";
  if (!title || title.length < 8) return true;
  if (title === "Untitled") return true;

  if (ROMANIZED_NON_EN.test(title)) return true;
  if (SELF_PROMO_PATTERNS.test(title)) return true;
  if (GENERIC_ONLY_HASHTAGS.test(title)) return true;
  if (hashtagSpamRatio(title) >= 0.6) return true;

  // Pure engagement bait with no remakeable hook
  const stripped = title.replace(SLOP_PATTERNS, "").replace(/#[\w.]+/g, "").trim();
  if (stripped.length < 12 && !isRemakeSignal(item)) return true;

  // Random personal clips without a format/sound/challenge signal
  if (!isRemakeSignal(item) && !item.soundOrFormat) {
    // Allow high-engagement product/news-ish English captions
    if (!/\b(how|why|what|when|this|my|i |we |try|use|make|best|worst|new|free|\$|%|tip)\b/i.test(title)) {
      return true;
    }
  }

  return false;
}

/**
 * Keep US-English remakeable trends for marketers/creators.
 * Prefers sounds, hashtags, POVs, tutorials, challenges over random FYP slop.
 */
export function filterQualityTrends(items: TrendItem[]): TrendItem[] {
  const kept = items.filter((item) => !isSlop(item));

  // Prefer remakeable items; if we still have enough, drop weak non-remake fillers.
  const remakes = kept.filter(isRemakeSignal);
  if (remakes.length >= 12) return remakes;

  return kept;
}

export function remakeBoost(item: TrendItem): number {
  if (item.externalId.startsWith("song-")) return 18;
  if (item.externalId.startsWith("hashtag-")) return 14;
  if (item.soundOrFormat) return 10;
  if (isRemakeSignal(item)) return 8;
  return 0;
}
