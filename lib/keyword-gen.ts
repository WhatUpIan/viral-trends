import OpenAI from "openai";

type BrandInput = {
  name: string;
  website?: string | null;
  description?: string | null;
};

function heuristicKeywords(brand: BrandInput): string[] {
  const name = brand.name.trim();
  const compact = name.replace(/\s+/g, "").toLowerCase();
  const out = new Set<string>([
    name,
    `${name} review`,
    `${name} reviews`,
    `#${compact}`,
    `@${compact}`,
  ]);
  if (brand.website) {
    try {
      const host = new URL(
        brand.website.startsWith("http") ? brand.website : `https://${brand.website}`,
      ).hostname.replace(/^www\./, "");
      out.add(host);
    } catch {
      // ignore malformed website
    }
  }
  return [...out];
}

/**
 * Generate search keywords for brand mention monitoring.
 * Falls back to name-based heuristics when OpenAI is unavailable.
 */
export async function generateBrandKeywords(brand: BrandInput): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return heuristicKeywords(brand);

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You generate search keywords for monitoring brand mentions across social media and the web.
Return JSON: { "keywords": string[] } with 8-15 entries.
Include: the exact brand name, common misspellings or shorthand people actually use, product names if inferable, the brand hashtag, and 2-3 "brand + intent" phrases (e.g. "<brand> review", "<brand> vs"). Keywords should be short search phrases, not sentences. No duplicates. No generic industry terms that would match unrelated content.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            name: brand.name,
            website: brand.website ?? null,
            description: brand.description ?? null,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { keywords?: unknown };
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string")
          .map((k) => k.trim())
          .filter((k) => k.length > 1 && k.length <= 80)
      : [];

    if (keywords.length === 0) return heuristicKeywords(brand);
    return [...new Set([brand.name.trim(), ...keywords])].slice(0, 15);
  } catch (err) {
    console.warn("[keyword-gen] OpenAI failed, using heuristics:", err);
    return heuristicKeywords(brand);
  }
}
