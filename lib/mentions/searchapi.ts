export type WebResult = {
  url: string;
  title: string;
  snippet: string | null;
  publishedAt: string | null;
  platform: "web" | "news";
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

async function searchApiFetch(
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
  // Relative strings like "19 hours ago" aren't parseable as absolute dates
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

/** @deprecated Use isSearchApiConfigured — kept so old imports keep working during rename. */
export const isSerpApiConfigured = isSearchApiConfigured;
