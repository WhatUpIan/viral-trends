import { createClient } from "@/lib/supabase/server";
import type { BrandSocialAccount, SocialPlatform } from "@/lib/mentions/own-account";

export type KeywordKind = "generated" | "custom" | "negative";

export type Brand = {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  status: "active" | "paused";
  createdAt: string;
};

export type BrandKeyword = {
  id: string;
  keyword: string;
  kind: KeywordKind;
};

export type BrandMention = {
  id: string;
  source: "social" | "web";
  platform: string | null;
  url: string;
  title: string | null;
  snippet: string | null;
  matchedKeyword: string | null;
  author: string | null;
  metrics: Record<string, number>;
  publishedAt: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  createdAt: string;
};

export type MentionComment = {
  id: string;
  mentionId: string;
  author: string | null;
  text: string;
  likeCount: number | null;
  publishedAt: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
};

function toBrand(row: Record<string, unknown>): Brand {
  return {
    id: row.id as string,
    name: row.name as string,
    website: (row.website as string) ?? null,
    description: (row.description as string) ?? null,
    status: row.status as Brand["status"],
    createdAt: row.created_at as string,
  };
}

export async function listBrands(): Promise<(Brand & { mentionCount: number })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*, brand_mentions(count)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    ...toBrand(row),
    mentionCount:
      (row.brand_mentions as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export async function getBrand(id: string): Promise<Brand | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("*").eq("id", id).maybeSingle();
  return data ? toBrand(data) : null;
}

export async function getBrandSocialAccounts(brandId: string): Promise<BrandSocialAccount[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_social_accounts")
    .select("platform, handle")
    .eq("brand_id", brandId)
    .order("platform", { ascending: true });
  return (data ?? []).map((row) => ({
    platform: row.platform as SocialPlatform,
    handle: row.handle as string,
  }));
}

export async function getBrandKeywords(brandId: string): Promise<BrandKeyword[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_keywords")
    .select("id, keyword, kind")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: true });
  return (data ?? []) as BrandKeyword[];
}

export async function getBrandMentions(
  brandId: string,
  limit = 100,
): Promise<BrandMention[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_mentions")
    .select(
      "id, source, platform, url, title, snippet, matched_keyword, author, metrics, published_at, sentiment, created_at",
    )
    .eq("brand_id", brandId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    source: row.source,
    platform: row.platform,
    url: row.url,
    title: row.title,
    snippet: row.snippet,
    matchedKeyword: row.matched_keyword,
    author: row.author,
    metrics: (row.metrics as Record<string, number>) ?? {},
    publishedAt: row.published_at,
    sentiment: row.sentiment,
    createdAt: row.created_at,
  }));
}

export async function getMentionComments(
  brandId: string,
  limit = 200,
): Promise<(MentionComment & { mentionTitle: string | null; mentionUrl: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_mention_comments")
    .select(
      "id, mention_id, author, text, like_count, published_at, sentiment, brand_mentions!inner(brand_id, title, url)",
    )
    .eq("brand_mentions.brand_id", brandId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const mention = row.brand_mentions as unknown as {
      title: string | null;
      url: string;
    };
    return {
      id: row.id,
      mentionId: row.mention_id,
      author: row.author,
      text: row.text,
      likeCount: row.like_count,
      publishedAt: row.published_at,
      sentiment: row.sentiment,
      mentionTitle: mention?.title ?? null,
      mentionUrl: mention?.url ?? "",
    };
  });
}
