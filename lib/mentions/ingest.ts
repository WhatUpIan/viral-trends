import type { Comment, CreatorCrawl, Post } from "@creatorcrawl/sdk";
import { getCreatorCrawl, isCreatorCrawlConfigured } from "../creatorcrawl";
import { getSupabaseAdmin } from "../supabase";
import { isOwnMention, websiteHost, type BrandSocialAccount } from "./own-account";
import { isSerpApiConfigured, searchNews, searchWeb, type WebResult } from "./serpapi";

/** Keep CreatorCrawl credit usage bounded per brand per run */
const MAX_SEARCH_KEYWORDS = 5;
const POSTS_PER_QUERY = 5;
const COMMENT_FETCH_LIMIT = 5;
const COMMENTS_PER_MENTION = 25;

type BrandRow = {
  id: string;
  name: string;
  status: string;
  website: string | null;
};

type KeywordRow = {
  brand_id: string;
  keyword: string;
  kind: "generated" | "custom" | "negative";
};

type MentionInsert = {
  brand_id: string;
  source: "social" | "web";
  platform: string | null;
  external_id: string | null;
  url: string;
  title: string | null;
  snippet: string | null;
  matched_keyword: string | null;
  author: string | null;
  metrics: Record<string, number>;
  published_at: string | null;
  sentiment: string | null;
};

export type MentionsIngestResult = {
  ok: boolean;
  brandsProcessed: number;
  mentionsUpserted: number;
  commentsUpserted: number;
  skippedOwn?: number;
  byPlatform?: Record<string, number>;
  serpApiConfigured?: boolean;
  webErrors?: string[];
  error?: string;
};

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  let out = "";
  for (const ch of value.replace(/\u0000/g, "")) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    out += ch;
  }
  return out.trim() || null;
}

function matchesNegative(text: string, negatives: string[]): boolean {
  const lower = text.toLowerCase();
  return negatives.some((n) => lower.includes(n.toLowerCase()));
}

const POSITIVE_WORDS =
  /\b(love|loved|amazing|great|awesome|best|excellent|perfect|obsessed|recommend|incredible|fantastic|impressed)\b/i;
const NEGATIVE_WORDS =
  /\b(hate|hated|terrible|awful|worst|scam|broken|refund|disappointed|disappointing|garbage|trash|avoid|overpriced|waste)\b/i;

function heuristicSentiment(text: string): "positive" | "neutral" | "negative" {
  const pos = POSITIVE_WORDS.test(text);
  const neg = NEGATIVE_WORDS.test(text);
  if (pos && !neg) return "positive";
  if (neg && !pos) return "negative";
  return "neutral";
}

function postToMention(
  post: Post,
  platform: string,
  brandId: string,
  keyword: string,
): MentionInsert | null {
  const id = post.id ?? post.url;
  if (!id || !post.url) return null;
  const text = clean(post.text) ?? "";
  return {
    brand_id: brandId,
    source: "social",
    platform,
    external_id: String(id),
    url: post.url,
    title: text.slice(0, 200) || null,
    snippet: text.slice(0, 500) || null,
    matched_keyword: keyword,
    author: clean(post.author?.handle),
    metrics: {
      ...(post.view_count != null ? { views: post.view_count } : {}),
      ...(post.like_count != null ? { likes: post.like_count } : {}),
      ...(post.comment_count != null ? { comments: post.comment_count } : {}),
      ...(post.share_count != null ? { shares: post.share_count } : {}),
    },
    published_at: post.created_at ?? null,
    sentiment: text ? heuristicSentiment(text) : null,
  };
}

function webToMention(result: WebResult, brandId: string, keyword: string): MentionInsert {
  const text = `${result.title} ${result.snippet ?? ""}`;
  return {
    brand_id: brandId,
    source: "web",
    platform: result.platform,
    external_id: null,
    url: result.url,
    title: clean(result.title),
    snippet: clean(result.snippet),
    matched_keyword: keyword,
    author: null,
    metrics: {},
    published_at: result.publishedAt,
    sentiment: heuristicSentiment(text),
  };
}

async function searchSocial(
  cc: CreatorCrawl,
  keyword: string,
  brandId: string,
): Promise<MentionInsert[]> {
  const out: MentionInsert[] = [];

  const tasks: [string, Promise<Post[]>][] = [
    [
      "tiktok",
      cc.tiktok
        .searchKeyword({ query: keyword, region: "US", date_posted: "this_week" })
        .then((r) => r.data ?? []),
    ],
    [
      "youtube",
      cc.youtube
        .search({
          query: keyword,
          uploadDate: "month",
          sortBy: "relevance",
        })
        .then((r) => r.data ?? []),
    ],
    ["instagram", cc.instagram.searchReels({ query: keyword }).then((r) => r.data ?? [])],
    [
      "reddit",
      cc.reddit
        .search({ query: keyword, sort: "relevance", timeframe: "month" })
        .then((r) => r.data ?? []),
    ],
  ];

  const results = await Promise.allSettled(
    tasks.map(async ([platform, promise]) => {
      const posts = await promise;
      return posts
        .slice(0, POSTS_PER_QUERY)
        .map((post) => postToMention(post, platform, brandId, keyword))
        .filter((m): m is MentionInsert => m !== null);
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") out.push(...result.value);
    else console.warn(`[mentions] social search "${keyword}" failed:`, result.reason);
  }
  return out;
}

async function fetchCommentsForMention(
  cc: CreatorCrawl,
  platform: string | null,
  url: string,
): Promise<Comment[]> {
  try {
    if (platform === "tiktok") return (await cc.tiktok.comments({ url })).data ?? [];
    if (platform === "youtube") return (await cc.youtube.comments({ url })).data ?? [];
    if (platform === "instagram") return (await cc.instagram.comments({ url })).data ?? [];
    if (platform === "reddit") return (await cc.reddit.postComments({ url })).data ?? [];
  } catch (err) {
    console.warn(`[mentions] comments fetch failed for ${url}:`, err);
  }
  return [];
}

export async function runMentionsIngest(options?: {
  brandIds?: string[];
}): Promise<MentionsIngestResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      brandsProcessed: 0,
      mentionsUpserted: 0,
      commentsUpserted: 0,
      error: "Supabase is not configured",
    };
  }
  if (!isCreatorCrawlConfigured() && !isSerpApiConfigured()) {
    return {
      ok: false,
      brandsProcessed: 0,
      mentionsUpserted: 0,
      commentsUpserted: 0,
      error: "Neither CreatorCrawl nor SerpAPI is configured",
    };
  }

  let query = supabase.from("brands").select("id, name, status, website");
  if (options?.brandIds?.length) {
    query = query.in("id", options.brandIds);
  } else {
    query = query.eq("status", "active");
  }

  const { data: brands, error: brandsError } = await query;

  if (brandsError) {
    return {
      ok: false,
      brandsProcessed: 0,
      mentionsUpserted: 0,
      commentsUpserted: 0,
      error: `Failed to load brands: ${brandsError.message}`,
    };
  }

  const activeBrands = (brands ?? []) as BrandRow[];
  if (activeBrands.length === 0) {
    return { ok: true, brandsProcessed: 0, mentionsUpserted: 0, commentsUpserted: 0 };
  }

  const { data: keywordRows } = await supabase
    .from("brand_keywords")
    .select("brand_id, keyword, kind")
    .in(
      "brand_id",
      activeBrands.map((b) => b.id),
    );

  const { data: accountRows } = await supabase
    .from("brand_social_accounts")
    .select("brand_id, platform, handle")
    .in(
      "brand_id",
      activeBrands.map((b) => b.id),
    );

  const keywordsByBrand = new Map<string, KeywordRow[]>();
  for (const row of (keywordRows ?? []) as KeywordRow[]) {
    const list = keywordsByBrand.get(row.brand_id) ?? [];
    list.push(row);
    keywordsByBrand.set(row.brand_id, list);
  }

  const accountsByBrand = new Map<string, BrandSocialAccount[]>();
  for (const row of accountRows ?? []) {
    const list = accountsByBrand.get(row.brand_id) ?? [];
    list.push({
      platform: row.platform as BrandSocialAccount["platform"],
      handle: row.handle as string,
    });
    accountsByBrand.set(row.brand_id, list);
  }

  const cc = isCreatorCrawlConfigured() ? getCreatorCrawl() : null;
  let mentionsUpserted = 0;
  let commentsUpserted = 0;
  let skippedOwn = 0;
  const byPlatform: Record<string, number> = {};
  const webErrors: string[] = [];

  for (const brand of activeBrands) {
    const rows = keywordsByBrand.get(brand.id) ?? [];
    const socialAccounts = accountsByBrand.get(brand.id) ?? [];
    const excludeDomain = websiteHost(brand.website);
    const negatives = rows.filter((r) => r.kind === "negative").map((r) => r.keyword);
    // Custom keywords take priority over generated ones within the search budget
    const searchKeywords = [
      ...rows.filter((r) => r.kind === "custom").map((r) => r.keyword),
      ...rows.filter((r) => r.kind === "generated").map((r) => r.keyword),
    ];
    const queries = [...new Set([brand.name, ...searchKeywords])].slice(
      0,
      MAX_SEARCH_KEYWORDS,
    );

    const mentions: MentionInsert[] = [];

    for (const keyword of queries) {
      if (cc) {
        mentions.push(...(await searchSocial(cc, keyword, brand.id)));
      }
      if (isSerpApiConfigured()) {
        const [web, news] = await Promise.allSettled([
          searchWeb(keyword, excludeDomain),
          searchNews(keyword, excludeDomain),
        ]);
        if (web.status === "fulfilled") {
          mentions.push(...web.value.map((r) => webToMention(r, brand.id, keyword)));
        } else {
          const msg = web.reason instanceof Error ? web.reason.message : String(web.reason);
          console.warn(`[mentions] web search "${keyword}" failed:`, msg);
          if (webErrors.length < 3 && !webErrors.includes(msg)) webErrors.push(msg);
        }
        if (news.status === "fulfilled") {
          mentions.push(...news.value.map((r) => webToMention(r, brand.id, keyword)));
        } else {
          const msg =
            news.reason instanceof Error ? news.reason.message : String(news.reason);
          console.warn(`[mentions] news search "${keyword}" failed:`, msg);
          if (webErrors.length < 3 && !webErrors.includes(msg)) webErrors.push(msg);
        }
      }
    }

    // Drop negative keywords and posts from the brand's own official accounts.
    // Social search results already matched the keyword query — no extra caption check.
    const filtered = mentions.filter((m) => {
      const text = `${m.title ?? ""} ${m.snippet ?? ""} ${m.author ?? ""}`;
      if (matchesNegative(text, negatives)) return false;
      if (isOwnMention(m, socialAccounts, brand.website)) {
        skippedOwn++;
        return false;
      }
      return true;
    });

    // Dedupe by URL within this run
    const byUrl = new Map<string, MentionInsert>();
    for (const m of filtered) {
      if (!byUrl.has(m.url)) byUrl.set(m.url, m);
    }
    const unique = [...byUrl.values()];

    for (let i = 0; i < unique.length; i += 20) {
      const batch = unique.slice(i, i + 20);
      const { error } = await supabase
        .from("brand_mentions")
        .upsert(batch, { onConflict: "brand_id,url", ignoreDuplicates: false });
      if (error) {
        console.warn(`[mentions] upsert failed for brand ${brand.name}:`, error.message);
      } else {
        mentionsUpserted += batch.length;
        for (const m of batch) {
          const key = m.platform ?? m.source;
          byPlatform[key] = (byPlatform[key] ?? 0) + 1;
        }
      }
    }

    // Pull comments for the most-engaged social mentions (feedback tracking)
    if (cc) {
      const { data: topSocial } = await supabase
        .from("brand_mentions")
        .select("id, platform, url")
        .eq("brand_id", brand.id)
        .eq("source", "social")
        .order("created_at", { ascending: false })
        .limit(COMMENT_FETCH_LIMIT);

      for (const mention of topSocial ?? []) {
        const comments = await fetchCommentsForMention(cc, mention.platform, mention.url);
        const rows = comments
          .slice(0, COMMENTS_PER_MENTION)
          .filter((c) => c.id && c.text)
          .map((c) => ({
            mention_id: mention.id,
            external_id: String(c.id),
            author: clean(c.author?.handle ?? null),
            text: clean(c.text) ?? "",
            like_count: c.like_count ?? null,
            published_at: c.created_at ?? null,
            sentiment: heuristicSentiment(c.text),
          }))
          .filter((r) => r.text.length > 0);

        if (rows.length > 0) {
          const { error } = await supabase
            .from("brand_mention_comments")
            .upsert(rows, { onConflict: "mention_id,external_id" });
          if (!error) commentsUpserted += rows.length;
        }
      }
    }

    // Remove any previously stored mentions from the brand's own accounts
    const { data: stored } = await supabase
      .from("brand_mentions")
      .select("id, source, platform, url, author")
      .eq("brand_id", brand.id);

    const ownIds = (stored ?? [])
      .filter((m) =>
        isOwnMention(
          {
            source: m.source as "social" | "web",
            platform: m.platform as string | null,
            url: m.url as string,
            author: m.author as string | null,
          },
          socialAccounts,
          brand.website,
        ),
      )
      .map((m) => m.id as string);

    if (ownIds.length > 0) {
      await supabase.from("brand_mentions").delete().in("id", ownIds);
      skippedOwn += ownIds.length;
    }
  }

  return {
    ok: true,
    brandsProcessed: activeBrands.length,
    mentionsUpserted,
    commentsUpserted,
    skippedOwn,
    byPlatform,
    serpApiConfigured: isSerpApiConfigured(),
    webErrors: webErrors.length > 0 ? webErrors : undefined,
  };
}
