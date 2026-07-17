export type WebResult = {
  url: string;
  title: string;
  snippet: string | null;
  publishedAt: string | null;
  platform: "web" | "news" | "youtube";
  author?: string | null;
  thumbnailUrl?: string | null;
  metrics?: Record<string, number>;
  externalId?: string | null;
};

/** SearchAPI.io (https://www.searchapi.io) — preferred. Also accepts legacy SERPAPI_API_KEY. */
export function isSearchApiConfigured(): boolean {
  return Boolean(process.env.SEARCHAPI_API_KEY || process.env.SERPAPI_API_KEY);
}

function getApiKey(): string {
  const key = process.env.SEARCHAPI_API_KEY || process.env.SERPAPI_API_KEY;
  if (!key) throw new Error("SEARCHAPI_API_KEY is not set");
  return key;
}

export async function searchApiFetch(
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const apiKey = getApiKey();
  const search = new URLSearchParams({ ...params, api_key: apiKey, gl: "us", hl: "en" });
  const res = await fetch(`https://www.searchapi.io/api/v1/search?${search}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SearchAPI ${params.engine} HTTP ${res.status}: ${body.slice(0, 180)}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const errMsg = json.error;
  if (typeof errMsg === "string" && errMsg) {
    throw new Error(`SearchAPI ${params.engine}: ${errMsg.slice(0, 180)}`);
  }
  return json;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/ago|hour|day|week|month|year|yesterday|today/i.test(value) && !/\d{4}/.test(value)) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapOrganic(rows: Record<string, unknown>[], platform: "web" | "news"): WebResult[] {
  return rows
    .filter((r) => typeof r.link === "string" && typeof r.title === "string")
    .map((r) => ({
      url: r.link as string,
      title: r.title as string,
      snippet: typeof r.snippet === "string" ? r.snippet : null,
      publishedAt: parseDate(r.date),
      platform,
    }));
}

/** Google web results for a keyword. Optionally exclude the brand's own domain. */
export async function searchWeb(
  query: string,
  excludeDomain?: string | null,
): Promise<WebResult[]> {
  const q = excludeDomain ? `${query} -site:${excludeDomain}` : query;
  const data = await searchApiFetch({ engine: "google", q, num: "10" });
  return mapOrganic((data.organic_results ?? []) as Record<string, unknown>[], "web");
}

/** Bing web results — second web surface via SearchAPI. */
export async function searchBing(
  query: string,
  excludeDomain?: string | null,
): Promise<WebResult[]> {
  const q = excludeDomain ? `${query} -site:${excludeDomain}` : query;
  const data = await searchApiFetch({ engine: "bing", q });
  return mapOrganic((data.organic_results ?? []) as Record<string, unknown>[], "web");
}

/**
 * Google News results for a keyword.
 * SearchAPI returns news under organic_results (and sometimes top_stories).
 */
export async function searchNews(
  query: string,
  excludeDomain?: string | null,
): Promise<WebResult[]> {
  const q = excludeDomain ? `${query} -site:${excludeDomain}` : query;
  const data = await searchApiFetch({
    engine: "google_news",
    q,
    time_period: "last_month",
  });
  const organic = mapOrganic(
    (data.organic_results ?? []) as Record<string, unknown>[],
    "news",
  );
  const topStories = mapOrganic(
    (data.top_stories ?? []) as Record<string, unknown>[],
    "news",
  );
  const byUrl = new Map<string, WebResult>();
  for (const r of [...organic, ...topStories]) {
    if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  }
  return [...byUrl.values()];
}

function youtubeThumb(id: string, thumb: unknown): string {
  if (typeof thumb === "string" && thumb.startsWith("http")) return thumb;
  if (thumb && typeof thumb === "object") {
    const t = thumb as Record<string, unknown>;
    if (typeof t.static === "string") return t.static;
    if (typeof t.rich === "string") return t.rich;
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * YouTube keyword search via SearchAPI (videos + Shorts sections).
 * Complements CreatorCrawl YouTube for brand mention monitoring.
 */
export async function searchYouTube(query: string): Promise<WebResult[]> {
  const data = await searchApiFetch({ engine: "youtube", q: query });
  const out: WebResult[] = [];

  const videos = (data.videos ?? []) as Record<string, unknown>[];
  for (const v of videos.slice(0, 8)) {
    if (typeof v.link !== "string" || typeof v.title !== "string") continue;
    const id = typeof v.id === "string" ? v.id : null;
    const channel = v.channel as Record<string, unknown> | undefined;
    out.push({
      url: v.link,
      title: v.title,
      snippet: typeof v.description === "string" ? v.description : null,
      publishedAt: parseDate(v.published_time),
      platform: "youtube",
      author:
        typeof channel?.title === "string"
          ? channel.title
          : typeof channel?.link === "string"
            ? channel.link
            : null,
      thumbnailUrl: id ? youtubeThumb(id, v.thumbnail) : null,
      externalId: id,
      metrics: {
        ...(typeof v.extracted_views === "number" ? { views: v.extracted_views } : {}),
      },
    });
  }

  const sections = (data.sections ?? []) as Record<string, unknown>[];
  for (const section of sections) {
    const name = String(section.section_name ?? section.section_title ?? "").toLowerCase();
    if (!name.includes("short")) continue;
    const items = (section.items ?? []) as Record<string, unknown>[];
    for (const item of items.slice(0, 6)) {
      if (typeof item.link !== "string" || typeof item.title !== "string") continue;
      const id = typeof item.id === "string" ? item.id : null;
      out.push({
        url: item.link,
        title: item.title,
        snippet: null,
        publishedAt: null,
        platform: "youtube",
        author: null,
        thumbnailUrl:
          typeof item.thumbnail === "string"
            ? item.thumbnail
            : id
              ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
              : null,
        externalId: id,
      });
    }
  }

  const byUrl = new Map<string, WebResult>();
  for (const r of out) {
    if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  }
  return [...byUrl.values()];
}

/** @deprecated Use isSearchApiConfigured */
export const isSerpApiConfigured = isSearchApiConfigured;
