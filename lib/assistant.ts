import OpenAI from "openai";
import { getDashboardData } from "@/lib/dashboard";
import { getCompetitorCompare } from "@/lib/competitors";
import { scoreOpportunities } from "@/lib/opportunity";
import { listBrands, getBrandMentions } from "@/lib/brands";
import { listEntities } from "@/lib/entities";

export type AssistantMessage = { role: "user" | "assistant"; content: string };

async function gatherAssistantContext() {
  const [dash, competitors, opportunities, brands, trends] = await Promise.all([
    getDashboardData(),
    getCompetitorCompare(),
    scoreOpportunities(8),
    listBrands(),
    listEntities({ type: "trend", limit: 12, orderBy: "heat" }),
  ]);

  const complaints: string[] = [];
  for (const brand of brands.slice(0, 5)) {
    const mentions = await getBrandMentions(brand.id);
    for (const m of mentions.filter((x) => x.sentiment === "negative").slice(0, 3)) {
      complaints.push(
        `${brand.name}: ${(m.title ?? m.snippet ?? "").slice(0, 100)}`,
      );
    }
  }

  return {
    kpis: dash.kpis,
    alerts: dash.alerts.slice(0, 5),
    competitors: competitors.map((c) => ({
      brand: c.brandName,
      sov: c.shareOfVoice,
      competitors: c.competitors.slice(0, 5).map((x) => ({
        name: x.name,
        hits: x.mentionHits,
        sentiment: x.sentimentLabel,
      })),
    })),
    opportunities: opportunities.slice(0, 5).map((o) => ({
      name: o.trend.name,
      score: o.score,
      heat: o.heat,
      bestFit: o.bestFitIndustries,
      rationale: o.rationale,
    })),
    topTrends: trends.map((t) => ({
      name: t.name,
      status: t.status,
      heat: t.metrics.heat ?? 0,
      slug: t.slug,
    })),
    complaints: complaints.slice(0, 6),
    brandNames: brands.map((b) => b.name),
  };
}

function templateReply(question: string, ctx: Awaited<ReturnType<typeof gatherAssistantContext>>): string {
  const q = question.toLowerCase();

  if (q.includes("complaint") || q.includes("negative") || q.includes("risk")) {
    if (ctx.complaints.length === 0) {
      return "No negative-sentiment mentions are indexed right now. Run brand monitoring to refresh complaints.";
    }
    return `Recent complaint/risk signals:\n${ctx.complaints.map((c) => `• ${c}`).join("\n")}`;
  }

  if (q.includes("competitor")) {
    if (ctx.competitors.length === 0) {
      return "No brands yet — add a brand with competitors to unlock compare intel.";
    }
    const lines = ctx.competitors.flatMap((c) =>
      c.competitors.length
        ? [
            `${c.brand} (SOV ${c.sov ?? "—"}%): ` +
              c.competitors.map((x) => `${x.name} ${x.hits} hits / ${x.sentiment}`).join("; "),
          ]
        : [`${c.brand}: no competitors listed yet.`],
    );
    return lines.join("\n");
  }

  if (q.includes("join") || q.includes("trend") || q.includes("opportunit")) {
    if (ctx.opportunities.length === 0) {
      return "No trend entities scored yet — wait for daily ingest to populate the Trend Database.";
    }
    const top = ctx.opportunities[0];
    return `Top opportunity: “${top.name}” (score ${top.score}, heat ${top.heat}). ${top.rationale} Best-fit industries: ${top.bestFit.join(", ") || "—"}.`;
  }

  if (q.includes("brand") || q.includes("health") || q.includes("how am i") || q.includes("summar")) {
    return `Brand health: ${ctx.kpis.brandHealth.label} (score ${ctx.kpis.brandHealth.score || "—"}). Mentions today ${ctx.kpis.mentionsToday}, unread ${ctx.kpis.unread}, high-risk ${ctx.kpis.highRiskAlerts}. Brands: ${ctx.brandNames.join(", ") || "none"}.`;
  }

  return `I can summarize brand health, list complaints, compare competitors, or recommend a trend to join. Top heat signal: ${ctx.topTrends[0]?.name ?? "none yet"}.`;
}

/**
 * Platform AI assistant — answers using dashboard, brands, opportunities, competitors.
 */
export async function askAssistant(
  question: string,
  history: AssistantMessage[] = [],
): Promise<string> {
  const ctx = await gatherAssistantContext();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return templateReply(question, ctx);

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `You are Signalbrief, an internet intelligence assistant for marketers.
Use only the provided context. Be concise (under 160 words). Prefer bullets for lists.
If data is missing, say what to run (monitoring / ingest) — do not invent metrics.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            context: ctx,
            question,
            history: history.slice(-6),
          }),
        },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || templateReply(question, ctx);
  } catch (err) {
    console.warn("[assistant] OpenAI failed:", err);
    return templateReply(question, ctx);
  }
}
