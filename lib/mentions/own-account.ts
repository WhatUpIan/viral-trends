export type SocialPlatform = "tiktok" | "youtube" | "instagram" | "x" | "reddit";

export type BrandSocialAccount = {
  platform: SocialPlatform;
  handle: string;
};

export const SOCIAL_PLATFORMS: { id: SocialPlatform; label: string; placeholder: string }[] = [
  { id: "tiktok", label: "TikTok", placeholder: "yourbrand" },
  { id: "instagram", label: "Instagram", placeholder: "yourbrand" },
  { id: "youtube", label: "YouTube", placeholder: "yourbrand or @yourbrand" },
  { id: "x", label: "X (Twitter)", placeholder: "yourbrand" },
  { id: "reddit", label: "Reddit", placeholder: "yourbrand" },
];

/** Strip @ and lowercase for comparison */
export function normalizeHandle(handle: string): string {
  return handle.replace(/^@+/, "").toLowerCase().trim();
}

export function websiteHost(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

type MentionLike = {
  source: "social" | "web";
  platform: string | null;
  url: string;
  author: string | null;
};

/**
 * True when the mention is from the brand's own official account or website.
 */
export function isOwnMention(
  mention: MentionLike,
  accounts: BrandSocialAccount[],
  website: string | null | undefined,
): boolean {
  const url = mention.url.toLowerCase();

  const host = websiteHost(website);
  if (host && url.includes(host)) return true;

  if (mention.source !== "social" || !mention.platform) return false;

  for (const acc of accounts) {
    if (acc.platform !== mention.platform) continue;
    const handle = normalizeHandle(acc.handle);
    if (!handle) continue;

    const author = normalizeHandle(mention.author ?? "");

    if (author === handle) return true;

    switch (mention.platform) {
      case "tiktok":
        if (url.includes(`/@${handle}`) || url.includes(`tiktok.com/${handle}`)) return true;
        break;
      case "instagram":
        if (
          url.includes(`instagram.com/${handle}`) ||
          url.includes(`instagram.com/${handle}/`)
        ) {
          return true;
        }
        break;
      case "youtube":
        if (
          url.includes(`/@${handle}`) ||
          url.includes(`/c/${handle}`) ||
          url.includes(`/user/${handle}`)
        ) {
          return true;
        }
        break;
      case "x":
        if (url.includes(`twitter.com/${handle}`) || url.includes(`x.com/${handle}`)) {
          return true;
        }
        break;
      case "reddit":
        if (url.includes(`/user/${handle}`) || url.includes(`/u/${handle}`)) return true;
        break;
    }
  }

  return false;
}
