import { listBrands, getBrandMentions, getBrandKeywords, type BrandMention } from "@/lib/brands";
import { listRelated } from "@/lib/entities";
import { createClient } from "@/lib/supabase/server";
import { getReportByDate, getTodayDateString, listReports } from "@/lib/reports";
import type { DailyReport, ReportTrend } from "@/lib/types";

export type DashboardKpis = {
  brandHealth: { score: number; label: "Positive" | "Neutral" | "Caution" | "No data" };
  mentionsToday: number;
  unread: number;
  trendingOpportunities: number;
  highRiskAlerts: number;
  competitorsMentioned: number;
  newViralTrends: number;
};

export type DashboardData = {
  kpis: DashboardKpis;
  brandHealth: {
    mentionsByDay: { date: string; count: number }[];
    sentiment: { positive: number; neutral: number; negative: number };
    topKeywords: { keyword: string; count: number }[];
    newCreators: string[];
  };
  internetNow: {
    topTrends: ReportTrend[];
    fastestGrowing: ReportTrend[];
    topSounds: { name: string; heat: number }[];
    mostRemixedFormat: string | null;
    reportDate: string | null;
    summary: string | null;
  };
  alerts: { id: string; severity: "high" | "medium" | "info"; text: string; href?: string }[];
  hasBrands: boolean;
};

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function sentimentLabel(
  pos: number,
  neu: number,
  neg: number,
): DashboardKpis["brandHealth"] {
  const total = pos + neu + neg;
  if (total === 0) return { score: 0, label: "No data" };
  const score = Math.round(((pos * 100 + neu * 55 + neg * 15) / total));
  if (neg > pos && neg / total > 0.35) return { score, label: "Caution" };
  if (pos >= neu && pos >= neg) return { score, label: "Positive" };
  return { score, label: "Neutral" };
}

function reach(m: BrandMention): number {
  return (
    (m.metrics.views ?? 0) ||
    (m.metrics.likes ?? 0) * 20 ||
    (m.metrics.comments ?? 0) * 50
  );
}

export async function getDashboardData(): Promise<DashboardData> {
  const brands = await listBrands();
  const today = getTodayDateString();
  const todayStart = startOfUtcDay().toISOString();

  let report: DailyReport | null = await getReportByDate(today);
  if (!report) {
    const recent = await listReports();
    if (recent[0]) report = await getReportByDate(recent[0].reportDate);
  }

  const allMentions: (BrandMention & { brandId: string; brandName: string })[] = [];
  const keywordHits = new Map<string, number>();
  let competitorNames: string[] = [];

  for (const brand of brands) {
    const mentions = await getBrandMentions(brand.id);
    for (const m of mentions) {
      allMentions.push({ ...m, brandId: brand.id, brandName: brand.name });
    }
    const kws = await getBrandKeywords(brand.id);
    for (const k of kws.filter((x) => x.kind !== "negative")) {
      const count = mentions.filter(
        (m) =>
          m.matchedKeyword?.toLowerCase() === k.keyword.toLowerCase() ||
          (m.title ?? "").toLowerCase().includes(k.keyword.toLowerCase()),
      ).length;
      if (count > 0) keywordHits.set(k.keyword, (keywordHits.get(k.keyword) ?? 0) + count);
    }
    competitorNames.push(...(brand.metadata.competitors ?? []));

    // Prefer graph competitors when brand has entity_id
    const supabase = await createClient();
    const { data: brandRow } = await supabase
      .from("brands")
      .select("entity_id")
      .eq("id", brand.id)
      .maybeSingle();
    if (brandRow?.entity_id) {
      const related = await listRelated(brandRow.entity_id as string, "competes_with");
      competitorNames.push(...related.map((r) => r.entity.name));
    }
  }

  competitorNames = [...new Set(competitorNames.map((c) => c.trim()).filter(Boolean))];

  const mentionsToday = allMentions.filter((m) => m.createdAt >= todayStart).length;
  const unread = allMentions.filter((m) => !m.viewed).length;
  const highRisk = allMentions.filter(
    (m) => m.sentiment === "negative" && (reach(m) >= 10_000 || !m.viewed),
  );

  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  for (const m of allMentions) {
    if (m.sentiment === "positive") sentiment.positive += 1;
    else if (m.sentiment === "negative") sentiment.negative += 1;
    else sentiment.neutral += 1;
  }

  const brandHealth = sentimentLabel(sentiment.positive, sentiment.neutral, sentiment.negative);

  // Mentions over last 7 days
  const mentionsByDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    mentionsByDay.push({
      date: key,
      count: allMentions.filter((m) => dayKey(m.createdAt) === key).length,
    });
  }

  const topKeywords = [...keywordHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([keyword, count]) => ({ keyword, count }));

  const creatorSeen = new Set<string>();
  const newCreators: string[] = [];
  for (const m of [...allMentions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!m.author) continue;
    const key = m.author.toLowerCase();
    if (creatorSeen.has(key)) continue;
    creatorSeen.add(key);
    if (m.createdAt >= todayStart || newCreators.length < 6) {
      newCreators.push(m.author.replace(/^@/, ""));
    }
    if (newCreators.length >= 8) break;
  }

  const trends = report?.trends ?? [];
  const topTrends = trends.slice(0, 6);
  const fastestGrowing = [...trends].sort((a, b) => b.heatScore - a.heatScore).slice(0, 5);

  const soundMap = new Map<string, number>();
  for (const t of trends) {
    if (!t.soundOrFormat) continue;
    soundMap.set(t.soundOrFormat, Math.max(soundMap.get(t.soundOrFormat) ?? 0, t.heatScore));
  }
  const topSounds = [...soundMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, heat]) => ({ name, heat }));

  const formatCounts = new Map<string, number>();
  for (const t of trends) {
    if (t.category === "Formats & Challenges" || t.category === "Sounds & Audio") {
      const key = t.soundOrFormat || t.title.slice(0, 60);
      formatCounts.set(key, (formatCounts.get(key) ?? 0) + 1);
    }
  }
  const mostRemixedFormat =
    [...formatCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    topSounds[0]?.name ??
    null;

  // Competitor mentioned in mention text
  const competitorsMentioned = competitorNames.filter((name) => {
    const lower = name.toLowerCase();
    return allMentions.some(
      (m) =>
        (m.title ?? "").toLowerCase().includes(lower) ||
        (m.snippet ?? "").toLowerCase().includes(lower),
    );
  }).length;

  const trendingOpportunities = trends.filter((t) => t.heatScore >= 70).length;

  const alerts: DashboardData["alerts"] = [];

  for (const m of highRisk.slice(0, 4)) {
    alerts.push({
      id: `risk-${m.id}`,
      severity: "high",
      text: `High-risk mention${m.author ? ` from @${m.author.replace(/^@/, "")}` : ""} on ${m.platform ?? m.source}: ${(m.title ?? m.snippet ?? "Untitled").slice(0, 80)}`,
      href: `/brands/${m.brandId}?tab=mentions&flag=unviewed`,
    });
  }

  for (const m of allMentions
    .filter((x) => reach(x) >= 50_000 || (x.metrics.views ?? 0) >= 50_000)
    .slice(0, 3)) {
    alerts.push({
      id: `reach-${m.id}`,
      severity: "medium",
      text: `A creator${m.author ? ` (@${m.author.replace(/^@/, "")})` : ""} mentioned ${m.brandName} with significant reach.`,
      href: `/brands/${m.brandId}`,
    });
  }

  for (const name of competitorNames.slice(0, 3)) {
    const hit = allMentions.find(
      (m) =>
        (m.title ?? "").toLowerCase().includes(name.toLowerCase()) ||
        (m.snippet ?? "").toLowerCase().includes(name.toLowerCase()),
    );
    if (hit) {
      alerts.push({
        id: `comp-${name}`,
        severity: "info",
        text: `Competitor signal: “${name}” appeared in recent coverage.`,
        href: `/brands/${hit.brandId}`,
      });
    }
  }

  if (trends[0]) {
    alerts.push({
      id: `trend-${trends[0].id}`,
      severity: "info",
      text: `Top signal right now: “${trends[0].title.slice(0, 70)}” (heat ${trends[0].heatScore}).`,
      href: "/trends",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "empty",
      severity: "info",
      text: brands.length
        ? "No urgent alerts. Run brand monitoring to refresh mentions."
        : "Add a brand to unlock health, alerts, and mention intelligence.",
      href: brands.length ? "/brands" : "/brands/new",
    });
  }

  return {
    kpis: {
      brandHealth,
      mentionsToday,
      unread,
      trendingOpportunities,
      highRiskAlerts: highRisk.length,
      competitorsMentioned,
      newViralTrends: trends.length,
    },
    brandHealth: {
      mentionsByDay,
      sentiment,
      topKeywords,
      newCreators,
    },
    internetNow: {
      topTrends,
      fastestGrowing,
      topSounds,
      mostRemixedFormat,
      reportDate: report?.reportDate ?? null,
      summary: report?.summary ?? null,
    },
    alerts: alerts.slice(0, 8),
    hasBrands: brands.length > 0,
  };
}
