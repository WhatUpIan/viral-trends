import { listBrands } from "@/lib/brands";
import { listEntities, type Entity } from "@/lib/entities";

/** Industries / verticals we score for white-space opportunity. */
export const OPPORTUNITY_INDUSTRIES = [
  "Construction",
  "Insurance",
  "Churches",
  "Plumbing",
  "Travel",
  "Education",
  "Fitness",
  "Food & Beverage",
  "SaaS",
  "Real Estate",
] as const;

export type OpportunityScore = {
  trend: Entity;
  /** 0–100: higher = more white space / remake opportunity */
  score: number;
  heat: number;
  industryPresence: { industry: string; estimate: number }[];
  rationale: string;
  bestFitIndustries: string[];
};

function heatOf(e: Entity): number {
  return e.metrics.heat ?? 0;
}

/**
 * Heuristic opportunity: high-heat trends that don't obviously belong to saturated consumer niches.
 * Industry "presence" is estimated from title/attrs keywords — not a full scrape (honest estimate).
 */
export async function scoreOpportunities(limit = 24): Promise<OpportunityScore[]> {
  const trends = await listEntities({ type: "trend", limit: 80, orderBy: "heat" });
  const brands = await listBrands();
  const userIndustries = brands
    .map((b) => b.metadata.industry)
    .filter((x): x is string => Boolean(x?.trim()));

  const scored: OpportunityScore[] = trends.map((trend) => {
    const heat = heatOf(trend);
    const text = `${trend.name} ${JSON.stringify(trend.attrs)}`.toLowerCase();

    const industryPresence = OPPORTUNITY_INDUSTRIES.map((industry) => {
      const key = industry.toLowerCase().split(/\s+/)[0] ?? industry.toLowerCase();
      // crude keyword presence — 0 if not mentioned in trend attrs/title
      const estimate = text.includes(key) ? 3 : 0;
      return { industry, estimate };
    });

    // Boost if user's brand industry isn't present on the trend
    for (const ind of userIndustries) {
      const row = industryPresence.find(
        (i) => i.industry.toLowerCase() === ind.toLowerCase() || ind.toLowerCase().includes(i.industry.toLowerCase().split(" ")[0] ?? ""),
      );
      if (row && row.estimate === 0) {
        // leave at 0 — white space for them
      }
    }

    const saturated = industryPresence.filter((i) => i.estimate > 0).length;
    const whiteSpace = Math.max(0, OPPORTUNITY_INDUSTRIES.length - saturated);
    // High heat + lots of empty industries = opportunity
    const score = Math.min(
      100,
      Math.round(heat * 0.55 + whiteSpace * 4 + (trend.status === "rising" || trend.status === "emerging" ? 12 : 0)),
    );

    const bestFitIndustries: string[] = industryPresence
      .filter((i) => i.estimate === 0)
      .slice(0, 4)
      .map((i) => i.industry);

    // Prefer user's industry first in best-fit if empty
    for (const ind of userIndustries) {
      if (!bestFitIndustries.includes(ind) && !text.includes(ind.toLowerCase().split(" ")[0] ?? "")) {
        bestFitIndustries.unshift(ind);
      }
    }

    const rationale =
      heat >= 70 && whiteSpace >= 6
        ? `High heat (${heat}) with little industry footprint — strong white-space remake window.`
        : heat >= 55
          ? `Solid signal (${heat}). Several industries still look under-represented.`
          : `Moderate heat. Watch for growth before committing production.`;

    return {
      trend,
      score,
      heat,
      industryPresence,
      rationale,
      bestFitIndustries: [...new Set(bestFitIndustries)].slice(0, 5),
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
