import OpenAI from "openai";
import type { Category, ClassifiedTrend, ScoredTrend } from "./types";
import { CATEGORIES } from "./types";

const FALLBACK_INSIGHT =
  "Rising engagement suggests this format still has room before saturation — remake or adapt within 24–48 hours.";

function heuristicCategory(item: ScoredTrend): Category {
  const text = `${item.title} ${item.soundOrFormat ?? ""}`.toLowerCase();

  if (item.soundOrFormat && /sound|audio|music|♪|song/i.test(item.soundOrFormat)) {
    return "Sounds & Audio";
  }
  if (/challenge|pov|trend|format|transition/i.test(text)) return "Formats & Challenges";
  if (/meme|funny|joke|lol|humor|skit/i.test(text)) return "Memes & Humor";
  if (/product|review|unbox|gadget|brand|haul|amazon/i.test(text)) return "Products & Brands";
  if (/news|politics|celeb|sports|culture|breaking/i.test(text)) return "News & Culture";
  if (/beauty|makeup|skincare|fashion|outfit|glow/i.test(text)) return "Beauty & Fashion";
  if (/fitness|workout|gym|wellness|health|yoga/i.test(text)) return "Fitness & Wellness";
  if (/food|recipe|cook|restaurant|grocery|eat/i.test(text)) return "Food & Drink";
  if (/ai|tech|game|gaming|app|software|code/i.test(text)) return "Tech & Gaming";
  if (item.platform === "tiktok" && item.externalId.startsWith("song-")) return "Sounds & Audio";
  if (item.platform === "tiktok" && item.externalId.startsWith("hashtag-")) {
    return "Formats & Challenges";
  }
  return "Other";
}

function parseCategory(value: unknown): Category {
  if (typeof value === "string" && (CATEGORIES as string[]).includes(value)) {
    return value as Category;
  }
  return "Other";
}

export async function classifyTrends(scored: ScoredTrend[]): Promise<ClassifiedTrend[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || scored.length === 0) {
    return scored.map((item) => ({
      ...item,
      category: heuristicCategory(item),
      insight: FALLBACK_INSIGHT,
    }));
  }

  const openai = new OpenAI({ apiKey });
  const batch = scored.slice(0, 40);

  const payload = batch.map((t, i) => ({
    i,
    platform: t.platform,
    title: t.title.slice(0, 120),
    sound: t.soundOrFormat?.slice(0, 80) ?? null,
    heat: t.heatScore,
  }));

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You classify short-form trends for US marketers and content creators who want to REMAKE or campaign on formats.
Return JSON: { "items": [ { "i": number, "category": string, "insight": string } ] }
category must be exactly one of: ${CATEGORIES.join(" | ")}
insight: 1-2 sentences on HOW to remake or adapt this for a brand/channel (hook, format, CTA). Skip generic "it's viral" language. If it looks like personal slop with no remake angle, say so briefly and suggest skipping.`,
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      items?: { i: number; category: string; insight: string }[];
    };
    const byIndex = new Map(
      (parsed.items ?? []).map((row) => [row.i, row] as const),
    );

    return scored.map((item, i) => {
      const row = byIndex.get(i);
      if (!row || i >= batch.length) {
        return {
          ...item,
          category: heuristicCategory(item),
          insight: FALLBACK_INSIGHT,
        };
      }
      return {
        ...item,
        category: parseCategory(row.category),
        insight: row.insight?.trim() || FALLBACK_INSIGHT,
      };
    });
  } catch (err) {
    console.warn("[classify] OpenAI failed, using heuristics:", err);
    return scored.map((item) => ({
      ...item,
      category: heuristicCategory(item),
      insight: FALLBACK_INSIGHT,
    }));
  }
}

export async function generateReportSummary(
  trends: ClassifiedTrend[],
): Promise<string> {
  const top = [...trends].sort((a, b) => b.heatScore - a.heatScore).slice(0, 5);
  const categories = [...new Set(top.map((t) => t.category))].slice(0, 3);

  const fallback = `Top heat today clusters around ${categories.join(", ") || "cross-platform formats"}. Prioritize the highest-scoring items within 24–48 hours.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || top.length === 0) return fallback;

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Write a 1-2 sentence executive summary for a daily viral trends brief aimed at marketers and creators. No fluff.",
        },
        {
          role: "user",
          content: JSON.stringify(
            top.map((t) => ({
              platform: t.platform,
              title: t.title,
              category: t.category,
              heat: t.heatScore,
            })),
          ),
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}
