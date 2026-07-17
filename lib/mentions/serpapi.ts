export type WebResult = {
  url: string;
  title: string;
  snippet: string | null;
  publishedAt: string | null;
  platform: "web" | "news";
};

export function isSerpApiConfigured(): boolean {
  return Boolean(process.env.SERPAPI_API_KEY);
}

async function serpFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("SERPAPI_API_KEY is not set");

  const search = new URLSearchParams({ ...params, api_key: apiKey, gl: "us", hl: "en" });
  const res = await fetch(`https://serpapi.com/search.json?${search}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SerpAPI ${params.engine} HTTP ${res.status}: ${body.slice(0, 180)}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const errMsg = json.error;
  if (typeof errMsg === "string" && errMsg) {
    throw new Error(`SerpAPI ${params.engine}: ${errMsg.slice(0, 180)}`);
  }
  return json;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Google web results for a keyword. Optionally exclude the brand's own domain. */
export async function searchWeb(
  query: string,
  excludeDomain?: string | null,
): Promise<WebResult[]> {
  const q = excludeDomain ? `${query} -site:${excludeDomain}` : query;
  const data = await serpFetch({ engine: "google", q, num: "10" });
  const organic = (data.organic_results ?? []) as Record<string, unknown>[];
  return organic
    .filter((r) => typeof r.link === "string" && typeof r.title === "string")
    .map((r) => ({
      url: r.link as string,
      title: r.title as string,
      snippet: typeof r.snippet === "string" ? r.snippet : null,
      publishedAt: parseDate(r.date),
      platform: "web" as const,
    }));
}

/** Google News results for a keyword. Optionally exclude the brand's own domain. */
export async function searchNews(
  query: string,
  excludeDomain?: string | null,
): Promise<WebResult[]> {
  const q = excludeDomain ? `${query} -site:${excludeDomain}` : query;
  const data = await serpFetch({ engine: "google_news", q });
  const news = (data.news_results ?? []) as Record<string, unknown>[];
  return news
    .filter((r) => typeof r.link === "string" && typeof r.title === "string")
    .map((r) => ({
      url: r.link as string,
      title: r.title as string,
      snippet: typeof r.snippet === "string" ? r.snippet : null,
      publishedAt: parseDate(r.date),
      platform: "news" as const,
    }));
}
