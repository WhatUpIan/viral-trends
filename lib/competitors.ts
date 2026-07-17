import { listBrands, getBrandMentions, type BrandMention } from "@/lib/brands";
import { listRelated } from "@/lib/entities";
import { createClient } from "@/lib/supabase/server";

export type CompetitorRow = {
  name: string;
  mentionHits: number;
  positive: number;
  neutral: number;
  negative: number;
  sentimentLabel: "Positive" | "Neutral" | "Caution" | "No data";
  /** Rough 7-day mention hits naming this competitor */
  last7: number;
};

export type CompetitorCompare = {
  brandId: string;
  brandName: string;
  brandMentions: number;
  brandLast7: number;
  brandSentiment: CompetitorRow["sentimentLabel"];
  shareOfVoice: number | null;
  competitors: CompetitorRow[];
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function last7Keys() {
  const keys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    keys.add(d.toISOString().slice(0, 10));
  }
  return keys;
}

function label(pos: number, neu: number, neg: number): CompetitorRow["sentimentLabel"] {
  const t = pos + neu + neg;
  if (t === 0) return "No data";
  if (neg > pos && neg / t > 0.35) return "Caution";
  if (pos >= neu && pos >= neg) return "Positive";
  return "Neutral";
}

function countSentiment(mentions: BrandMention[]) {
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const m of mentions) {
    if (m.sentiment === "positive") positive += 1;
    else if (m.sentiment === "negative") negative += 1;
    else neutral += 1;
  }
  return { positive, neutral, negative };
}

function mentionsNaming(mentions: BrandMention[], name: string) {
  const lower = name.toLowerCase();
  return mentions.filter(
    (m) =>
      (m.title ?? "").toLowerCase().includes(lower) ||
      (m.snippet ?? "").toLowerCase().includes(lower) ||
      (m.matchedKeyword ?? "").toLowerCase().includes(lower),
  );
}

export async function getCompetitorCompare(brandId?: string): Promise<CompetitorCompare[]> {
  const brands = await listBrands();
  const selected = brandId ? brands.filter((b) => b.id === brandId) : brands;
  const keys7 = last7Keys();
  const out: CompetitorCompare[] = [];

  for (const brand of selected) {
    const mentions = await getBrandMentions(brand.id);
    const brandSent = countSentiment(mentions);
    let competitorNames = [...(brand.metadata.competitors ?? [])];

    const supabase = await createClient();
    const { data: row } = await supabase
      .from("brands")
      .select("entity_id")
      .eq("id", brand.id)
      .maybeSingle();
    if (row?.entity_id) {
      const related = await listRelated(row.entity_id as string, "competes_with");
      competitorNames.push(...related.map((r) => r.entity.name));
    }
    competitorNames = [...new Set(competitorNames.map((c) => c.trim()).filter(Boolean))];

    const competitors: CompetitorRow[] = competitorNames.map((name) => {
      const hits = mentionsNaming(mentions, name);
      const s = countSentiment(hits);
      return {
        name,
        mentionHits: hits.length,
        ...s,
        sentimentLabel: label(s.positive, s.neutral, s.negative),
        last7: hits.filter((m) => keys7.has(dayKey(m.createdAt))).length,
      };
    });

    const competitorHits = competitors.reduce((n, c) => n + c.mentionHits, 0);
    const brandOnly = Math.max(mentions.length - competitorHits, 0);
    const denom = brandOnly + competitorHits;

    out.push({
      brandId: brand.id,
      brandName: brand.name,
      brandMentions: mentions.length,
      brandLast7: mentions.filter((m) => keys7.has(dayKey(m.createdAt))).length,
      brandSentiment: label(brandSent.positive, brandSent.neutral, brandSent.negative),
      shareOfVoice: denom === 0 || competitorNames.length === 0 ? null : Math.round((brandOnly / denom) * 100),
      competitors: competitors.sort((a, b) => b.mentionHits - a.mentionHits),
    });
  }

  return out;
}
