import OpenAI from "openai";
import { isSearchApiConfigured, searchApiFetch } from "@/lib/mentions/searchapi";
import type { SocialPlatform } from "@/lib/mentions/own-account";
import { SOCIAL_PLATFORMS } from "@/lib/mentions/own-account";

export type BrandResearchMetadata = {
  industry?: string;
  products?: string[];
  competitors?: string[];
  tagline?: string;
  targetAudience?: string;
  headquarters?: string;
  notes?: string;
};

export type BrandResearchResult = {
  name: string;
  website: string;
  description: string;
  socialAccounts: { platform: SocialPlatform; handle: string }[];
  keywords: string[];
  negativeKeywords: string[];
  metadata: BrandResearchMetadata;
  sources: string[];
};

type SocialLink = { platform: SocialPlatform; handle: string; url: string };

const SOCIAL_URL_PATTERNS: [SocialPlatform, RegExp][] = [
  ["tiktok", /tiktok\.com\/@?([a-zA-Z0-9._-]+)/i],
  ["instagram", /instagram\.com\/([a-zA-Z0-9._-]+)/i],
  ["youtube", /youtube\.com\/(?:@|c\/|channel\/|user\/)([a-zA-Z0-9._-]+)/i],
  ["x", /(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i],
  ["facebook", /facebook\.com\/([a-zA-Z0-9._-]+)/i],
  ["linkedin", /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._-]+)/i],
  ["reddit", /reddit\.com\/(?:u|user)\/([a-zA-Z0-9._-]+)/i],
];

const SKIP_HANDLES = new Set([
  "share",
  "sharer",
  "intent",
  "home",
  "login",
  "signup",
  "watch",
  "channel",
  "user",
  "company",
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "hashtag",
]);

function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function metaContent(html: string, key: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1].trim());
  }
  return "";
}

function extractSocialLinks(html: string, pageUrl: string): SocialLink[] {
  const found = new Map<SocialPlatform, SocialLink>();
  const hrefs = html.match(/href=["']([^"']+)["']/gi) ?? [];

  for (const raw of hrefs) {
    const href = raw.replace(/^href=["']|["']$/gi, "");
    let absolute = href;
    try {
      absolute = new URL(href, pageUrl).href;
    } catch {
      continue;
    }

    for (const [platform, re] of SOCIAL_URL_PATTERNS) {
      const m = absolute.match(re);
      if (!m?.[1]) continue;
      const handle = m[1].replace(/\/$/, "");
      if (!handle || SKIP_HANDLES.has(handle.toLowerCase())) continue;
      if (!found.has(platform)) {
        found.set(platform, { platform, handle, url: absolute });
      }
    }
  }

  return [...found.values()];
}

async function fetchWebsiteContent(url: string): Promise<{
  url: string;
  title: string;
  description: string;
  text: string;
  socialLinks: SocialLink[];
} | null> {
  const normalized = normalizeWebsite(url);
  if (!normalized) return null;

  try {
    const res = await fetch(normalized, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Signalbrief/1.0; +https://viral-trends-kn52.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    const title = decodeHtml(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "");
    const description =
      metaContent(html, "description") ||
      metaContent(html, "og:description") ||
      metaContent(html, "twitter:description");
    const text = stripHtml(html).slice(0, 12_000);
    const socialLinks = extractSocialLinks(html, res.url || normalized);

    return {
      url: res.url || normalized,
      title,
      description,
      text,
      socialLinks,
    };
  } catch (err) {
    console.warn("[brand-research] fetch failed:", err);
    return null;
  }
}

async function searchBrandContext(name: string, website: string): Promise<string[]> {
  if (!isSearchApiConfigured()) return [];

  const host = (() => {
    try {
      return new URL(normalizeWebsite(website)).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  const queries = [
    host ? `site:${host}` : null,
    `"${name}" brand`,
    host ? `"${name}" ${host}` : null,
  ].filter((q): q is string => Boolean(q));

  const snippets: string[] = [];

  await Promise.allSettled(
    queries.slice(0, 2).map(async (q) => {
      const json = await searchApiFetch({ engine: "google", q, num: "5" });
      const organic = (json.organic_results as Record<string, unknown>[] | undefined) ?? [];
      for (const row of organic.slice(0, 5)) {
        const title = typeof row.title === "string" ? row.title : "";
        const snippet = typeof row.snippet === "string" ? row.snippet : "";
        const link = typeof row.link === "string" ? row.link : "";
        if (title || snippet) {
          snippets.push([title, snippet, link].filter(Boolean).join(" — "));
        }
      }
    }),
  );

  return snippets.slice(0, 10);
}

function heuristicResearch(
  name: string,
  website: string,
  page: Awaited<ReturnType<typeof fetchWebsiteContent>>,
): BrandResearchResult {
  const compact = name.replace(/\s+/g, "").toLowerCase();
  const keywords = new Set<string>([
    name,
    `${name} review`,
    `${name} reviews`,
    `#${compact}`,
    `@${compact}`,
  ]);

  try {
    const host = new URL(normalizeWebsite(website)).hostname.replace(/^www\./, "");
    keywords.add(host);
  } catch {
    // ignore
  }

  const socialAccounts =
    page?.socialLinks.map(({ platform, handle }) => ({ platform, handle })) ?? [];

  return {
    name,
    website: page?.url ?? normalizeWebsite(website),
    description: page?.description || page?.title || `${name} brand monitoring`,
    socialAccounts,
    keywords: [...keywords].slice(0, 20),
    negativeKeywords: [],
    metadata: {},
    sources: page ? [page.url] : [normalizeWebsite(website)],
  };
}

function parseSocialAccounts(
  raw: unknown,
  fallback: SocialLink[],
): { platform: SocialPlatform; handle: string }[] {
  const validPlatforms = new Set(SOCIAL_PLATFORMS.map((p) => p.id));
  const out = new Map<SocialPlatform, string>();

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const platform = (item as { platform?: string }).platform;
      const handle = (item as { handle?: string }).handle;
      if (
        typeof platform === "string" &&
        validPlatforms.has(platform as SocialPlatform) &&
        typeof handle === "string" &&
        handle.trim()
      ) {
        out.set(platform as SocialPlatform, handle.replace(/^@+/, "").trim());
      }
    }
  }

  for (const link of fallback) {
    if (!out.has(link.platform)) out.set(link.platform, link.handle);
  }

  return [...out.entries()].map(([platform, handle]) => ({ platform, handle }));
}

function parseStringArray(raw: unknown, max = 20): string[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim())
        .filter((k) => k.length > 1 && k.length <= 80),
    ),
  ].slice(0, max);
}

/**
 * Research a brand from its name and website URL.
 * Fetches the homepage, optionally enriches with SearchAPI, then compiles a profile with OpenAI.
 */
export async function researchBrand(input: {
  name: string;
  website: string;
}): Promise<BrandResearchResult> {
  const name = input.name.trim();
  const website = normalizeWebsite(input.website);
  if (!name || !website) {
    throw new Error("Brand name and website URL are required.");
  }

  const [page, searchSnippets] = await Promise.all([
    fetchWebsiteContent(website),
    searchBrandContext(name, website),
  ]);

  const sources = new Set<string>([page?.url ?? website]);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return heuristicResearch(name, website, page);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You compile brand monitoring profiles for US marketers.
Return JSON:
{
  "description": string (2-4 sentences: what the brand sells, who it's for, positioning),
  "socialAccounts": [{ "platform": "tiktok"|"instagram"|"youtube"|"x"|"facebook"|"linkedin"|"reddit", "handle": string }],
  "keywords": string[] (exactly 20 short search phrases for mention monitoring — brand name variants, products, hashtags, review phrases, misspellings; no generic industry terms),
  "negativeKeywords": string[] (3-8 phrases to filter irrelevant mentions, e.g. homonyms, old products, unrelated franchises),
  "metadata": {
    "industry": string,
    "products": string[],
    "competitors": string[],
    "tagline": string,
    "targetAudience": string,
    "headquarters": string,
    "notes": string
  }
}
Rules:
- Only include social handles you are confident belong to THIS brand (from page links or well-known official accounts).
- Handles: no @ prefix; LinkedIn can be "company/slug".
- Keywords: practical for social/web search, not full sentences.
- Use homepage content as primary source; search snippets as secondary.
- If uncertain about a field, omit it or use empty array — do not invent.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            brandName: name,
            website,
            homepage: page
              ? {
                  url: page.url,
                  title: page.title,
                  description: page.description,
                  textExcerpt: page.text.slice(0, 6000),
                  socialLinks: page.socialLinks,
                }
              : null,
            searchSnippets,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      description?: unknown;
      socialAccounts?: unknown;
      keywords?: unknown;
      negativeKeywords?: unknown;
      metadata?: unknown;
    };

    const keywords = parseStringArray(parsed.keywords, 20);
    const negativeKeywords = parseStringArray(parsed.negativeKeywords, 8);
    const socialAccounts = parseSocialAccounts(parsed.socialAccounts, page?.socialLinks ?? []);

    const metadata: BrandResearchMetadata = {};
    if (parsed.metadata && typeof parsed.metadata === "object") {
      const m = parsed.metadata as Record<string, unknown>;
      if (typeof m.industry === "string") metadata.industry = m.industry.trim();
      if (typeof m.tagline === "string") metadata.tagline = m.tagline.trim();
      if (typeof m.targetAudience === "string") metadata.targetAudience = m.targetAudience.trim();
      if (typeof m.headquarters === "string") metadata.headquarters = m.headquarters.trim();
      if (typeof m.notes === "string") metadata.notes = m.notes.trim();
      if (Array.isArray(m.products)) metadata.products = parseStringArray(m.products, 10);
      if (Array.isArray(m.competitors)) metadata.competitors = parseStringArray(m.competitors, 8);
    }

    const description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : page?.description || page?.title || `${name} brand`;

    const finalKeywords =
      keywords.length >= 10
        ? [...new Set([name, ...keywords])].slice(0, 20)
        : heuristicResearch(name, website, page).keywords;

    return {
      name,
      website: page?.url ?? website,
      description,
      socialAccounts,
      keywords: finalKeywords,
      negativeKeywords,
      metadata,
      sources: [...sources],
    };
  } catch (err) {
    console.warn("[brand-research] OpenAI failed, using heuristics:", err);
    return heuristicResearch(name, website, page);
  }
}
