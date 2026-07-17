import OpenAI from "openai";
import {
  getBrand,
  getBrandMentions,
  getBrandKeywords,
  type BrandMention,
  type BrandMetadata,
} from "@/lib/brands";
import { listRelated } from "@/lib/entities";
import { createClient } from "@/lib/supabase/server";

export type BrandHealth = {
  score: number;
  sentimentLabel: "Positive" | "Neutral" | "Caution" | "No data";
  shareOfVoice: number | null;
  shareOfVoiceNote: string;
  competitorCount: number;
  competitorNames: string[];
  avgDailyMentions: number;
  growingTopics: string[];
  sentiment: { positive: number; neutral: number; negative: number };
  mentionsLast7: number;
  unread: number;
  insight: string | null;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function computeSentiment(mentions: BrandMention[]) {
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  for (const m of mentions) {
    if (m.sentiment === "positive") sentiment.positive += 1;
    else if (m.sentiment === "negative") sentiment.negative += 1;
    else sentiment.neutral += 1;
  }
  return sentiment;
}

function scoreFromSentiment(s: {
  positive: number;
  neutral: number;
  negative: number;
}): { score: number; label: BrandHealth["sentimentLabel"] } {
  const total = s.positive + s.neutral + s.negative;
  if (total === 0) return { score: 0, label: "No data" };
  const score = Math.round((s.positive * 100 + s.neutral * 55 + s.negative * 20) / total);
  if (s.negative > s.positive && s.negative / total > 0.35)
    return { score, label: "Caution" };
  if (s.positive >= s.neutral && s.positive >= s.negative)
    return { score, label: "Positive" };
  return { score, label: "Neutral" };
}

function growingTopicsFrom(
  metadata: BrandMetadata,
  mentions: BrandMention[],
  keywords: { keyword: string; kind: string }[],
): string[] {
  const topics = new Set<string>();
  for (const p of metadata.products ?? []) topics.add(p);
  if (metadata.industry) topics.add(metadata.industry);

  const freq = new Map<string, number>();
  for (const k of keywords.filter((x) => x.kind !== "negative")) {
    const count = mentions.filter(
      (m) =>
        m.matchedKeyword?.toLowerCase() === k.keyword.toLowerCase() ||
        `${m.title ?? ""} ${m.snippet ?? ""}`.toLowerCase().includes(k.keyword.toLowerCase()),
    ).length;
    if (count > 0) freq.set(k.keyword, count);
  }
  for (const [k] of [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    topics.add(k);
  }
  return [...topics].slice(0, 8);
}

async function generateInsight(
  brandName: string,
  mentions: BrandMention[],
  health: Omit<BrandHealth, "insight">,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (health.mentionsLast7 === 0) {
      return "No recent mentions yet — run monitoring to build your health signal.";
    }
    const deltaHint =
      health.sentimentLabel === "Positive"
        ? "Sentiment is leaning positive across recent coverage."
        : health.sentimentLabel === "Caution"
          ? "Negative signals are elevated — review unread mentions."
          : "Mention volume is steady; keep watching high-reach posts.";
    return `${brandName}: ${health.mentionsLast7} mentions in 7 days (avg ${health.avgDailyMentions}/day). ${deltaHint}`;
  }

  try {
    const sample = mentions.slice(0, 12).map((m) => ({
      title: m.title,
      snippet: m.snippet?.slice(0, 120),
      sentiment: m.sentiment,
      keyword: m.matchedKeyword,
      platform: m.platform,
      author: m.author,
    }));

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Write one short analyst sentence (max 40 words) explaining brand mention movement.
Return JSON: { "insight": string }. Be concrete. Do not invent numbers not provided.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            brand: brandName,
            health: {
              score: health.score,
              sentiment: health.sentimentLabel,
              avgDailyMentions: health.avgDailyMentions,
              mentionsLast7: health.mentionsLast7,
              growingTopics: health.growingTopics,
            },
            sampleMentions: sample,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { insight?: string };
    return typeof parsed.insight === "string" ? parsed.insight.trim() : null;
  } catch (err) {
    console.warn("[brand-insights] OpenAI failed:", err);
    return null;
  }
}

export async function getBrandHealth(brandId: string): Promise<BrandHealth | null> {
  const brand = await getBrand(brandId);
  if (!brand) return null;

  const mentions = await getBrandMentions(brandId);
  const keywords = await getBrandKeywords(brandId);
  const sentiment = computeSentiment(mentions);
  const { score, label } = scoreFromSentiment(sentiment);

  const last7Keys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    last7Keys.add(d.toISOString().slice(0, 10));
  }
  const mentionsLast7 = mentions.filter((m) => last7Keys.has(dayKey(m.createdAt))).length;
  const avgDailyMentions = Math.round((mentionsLast7 / 7) * 10) / 10;

  let competitorNames = [...(brand.metadata.competitors ?? [])];
  const supabase = await createClient();
  const { data: brandRow } = await supabase
    .from("brands")
    .select("entity_id, insight_cache, insight_cached_at")
    .eq("id", brandId)
    .maybeSingle();

  if (brandRow?.entity_id) {
    const related = await listRelated(brandRow.entity_id as string, "competes_with");
    competitorNames.push(...related.map((r) => r.entity.name));
  }
  competitorNames = [...new Set(competitorNames.map((c) => c.trim()).filter(Boolean))];

  // Share of voice: brand mentions vs mentions that name competitors (estimate)
  let competitorMentionHits = 0;
  for (const name of competitorNames) {
    const lower = name.toLowerCase();
    competitorMentionHits += mentions.filter(
      (m) =>
        (m.title ?? "").toLowerCase().includes(lower) ||
        (m.snippet ?? "").toLowerCase().includes(lower),
    ).length;
  }
  const brandOnly = Math.max(mentions.length - competitorMentionHits, 0);
  const denom = brandOnly + competitorMentionHits;
  const shareOfVoice =
    competitorNames.length === 0 || denom === 0
      ? null
      : Math.round((brandOnly / denom) * 100);

  const healthBase: Omit<BrandHealth, "insight"> = {
    score,
    sentimentLabel: label,
    shareOfVoice,
    shareOfVoiceNote:
      shareOfVoice === null
        ? "Add competitors in brand research to estimate share of voice."
        : "Estimate from your mention feed vs competitor name hits — not full market SOV.",
    competitorCount: competitorNames.length,
    competitorNames,
    avgDailyMentions,
    growingTopics: growingTopicsFrom(brand.metadata, mentions, keywords),
    sentiment,
    mentionsLast7,
    unread: mentions.filter((m) => !m.viewed).length,
  };

  // Cache insight for 12 hours
  const cachedAt = brandRow?.insight_cached_at
    ? new Date(brandRow.insight_cached_at as string).getTime()
    : 0;
  const cacheFresh = Date.now() - cachedAt < 12 * 60 * 60 * 1000;
  const cachedInsight =
    cacheFresh &&
    brandRow?.insight_cache &&
    typeof brandRow.insight_cache === "object" &&
    typeof (brandRow.insight_cache as { text?: string }).text === "string"
      ? (brandRow.insight_cache as { text: string }).text
      : null;

  let insight = cachedInsight;
  if (!insight) {
    insight = await generateInsight(brand.name, mentions, healthBase);
    if (insight) {
      await supabase
        .from("brands")
        .update({
          insight_cache: { text: insight },
          insight_cached_at: new Date().toISOString(),
        })
        .eq("id", brandId);
    }
  }

  return { ...healthBase, insight };
}
