import { getTrendIndustryStats, type IndustryStat } from "@/lib/adoption";
import { listBrands } from "@/lib/brands";
import { listEntities, listRelated, type Entity } from "@/lib/entities";
import { INDUSTRIES, canonicalizeIndustry } from "@/lib/industries";

export type OpportunityScore = {
  trend: Entity;
  /** 0–100: higher = more white space / remake opportunity */
  score: number;
  heat: number;
  industryPresence: {
    industry: string;
    brandCount: number;
    evidenceCount: number;
    /** @deprecated use brandCount — kept for older UI */
    estimate: number;
  }[];
  adoptingBrands: { name: string; slug: string }[];
  rationale: string;
  bestFitIndustries: string[];
  evidenceThin: boolean;
  userIndustryFit: boolean;
};

function heatOf(e: Entity): number {
  return e.metrics.heat ?? 0;
}

function statsToPresence(stats: IndustryStat[]) {
  return INDUSTRIES.map((industry) => {
    const row = stats.find((s) => s.industry === industry);
    const brandCount = row?.brandCount ?? 0;
    const evidenceCount = row?.evidenceCount ?? 0;
    return {
      industry,
      brandCount,
      evidenceCount,
      estimate: brandCount,
    };
  });
}

/**
 * Opportunity Engine v2 — scores from trend_industry_stats (real adoption counts).
 * Falls back to zero counts when stats table is empty (honest white space / thin evidence).
 */
export async function scoreOpportunities(limit = 24): Promise<OpportunityScore[]> {
  const trends = await listEntities({ type: "trend", limit: 80, orderBy: "heat" });
  const brands = await listBrands();
  const userIndustries = brands
    .map((b) => canonicalizeIndustry(b.metadata.industry))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const scored: OpportunityScore[] = [];

  for (const trend of trends) {
    const heat = heatOf(trend);
    const stats = await getTrendIndustryStats(trend.id);
    const industryPresence = statsToPresence(stats);

    const totalEvidence = industryPresence.reduce((n, i) => n + i.evidenceCount + i.brandCount, 0);
    const evidenceThin = totalEvidence === 0;

    // White space = industries with zero brand adoption
    const whiteSpaceIndustries = industryPresence.filter((i) => i.brandCount === 0);
    const whiteSpace = whiteSpaceIndustries.length;

    let userIndustryFit = false;
    for (const ind of userIndustries) {
      const row = industryPresence.find((i) => i.industry === ind);
      if (row && row.brandCount === 0) userIndustryFit = true;
    }

    let score = Math.round(
      heat * 0.5 +
        whiteSpace * 2.5 +
        (trend.status === "rising" || trend.status === "emerging" ? 10 : 0) +
        (userIndustryFit ? 15 : 0),
    );
    // When evidence is thin, cap confidence — still rankable but labeled
    if (evidenceThin) score = Math.min(score, 72);
    score = Math.max(0, Math.min(100, score));

    const bestFitIndustries: string[] = [];
    for (const ind of userIndustries) {
      const row = industryPresence.find((i) => i.industry === ind);
      if (row && row.brandCount === 0) bestFitIndustries.push(ind);
    }
    for (const i of whiteSpaceIndustries) {
      if (!bestFitIndustries.includes(i.industry)) bestFitIndustries.push(i.industry);
      if (bestFitIndustries.length >= 5) break;
    }

    let adoptingBrands: { name: string; slug: string }[] = [];
    try {
      const related = await listRelated(trend.id);
      // also inbound adopted_by — listRelated is outbound only; fetch inbound via both-ways if needed
      const { listRelatedBothWays } = await import("@/lib/entities");
      const both = await listRelatedBothWays(trend.id);
      adoptingBrands = both
        .filter(
          (r) =>
            (r.relation === "adopted_by" || r.relation === "mentions") &&
            (r.entity.type === "brand" || r.entity.type === "company"),
        )
        .map((r) => ({ name: r.entity.name, slug: r.entity.slug }))
        .slice(0, 8);
      void related;
    } catch {
      adoptingBrands = [];
    }

    const userIndLabel = userIndustries[0];
    const rationale = evidenceThin
      ? `Heat ${heat}, status ${trend.status}. Industry adoption evidence is still thin — treat scores as directional until more brands link to this trend.`
      : userIndustryFit && userIndLabel
        ? `Heat ${heat}. ${userIndLabel} shows 0 adopting brands in our graph — strong white-space fit for your portfolio.`
        : whiteSpace >= 10
          ? `Heat ${heat} with broad industry white space (${whiteSpace} industries at 0 brands).`
          : `Heat ${heat}. ${INDUSTRIES.length - whiteSpace} industries already showing adoption signals.`;

    scored.push({
      trend,
      score,
      heat,
      industryPresence,
      adoptingBrands,
      rationale,
      bestFitIndustries: bestFitIndustries.slice(0, 5),
      evidenceThin,
      userIndustryFit,
    });
  }

  // Prefer user-industry white space, then score
  scored.sort((a, b) => {
    if (a.userIndustryFit !== b.userIndustryFit) return a.userIndustryFit ? -1 : 1;
    return b.score - a.score;
  });

  return scored.slice(0, limit);
}

/** Count high-heat trends where the user's industry has zero brand adoption. */
export async function countUserIndustryOpportunities(): Promise<number> {
  const scores = await scoreOpportunities(40);
  return scores.filter((s) => s.userIndustryFit && s.heat >= 55).length;
}
