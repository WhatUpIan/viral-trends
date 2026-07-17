import OpenAI from "openai";
import { listBrands, getBrandMentions } from "@/lib/brands";
import { getDashboardData } from "@/lib/dashboard";
import { getReportByDate, getTodayDateString, listReports } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

export type MorningBriefContent = {
  headline: string;
  intro: string;
  bullets: string[];
  opportunity: string | null;
  generatedAt: string;
  source: "openai" | "template";
};

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function gatherContext() {
  const dash = await getDashboardData();
  const today = getTodayDateString();
  let report = await getReportByDate(today);
  if (!report) {
    const list = await listReports();
    if (list[0]) report = await getReportByDate(list[0].reportDate);
  }

  const brands = await listBrands();
  const todayStart = startOfUtcDay().toISOString();
  const yDate = new Date();
  yDate.setUTCDate(yDate.getUTCDate() - 1);
  const yStart = startOfUtcDay(yDate).toISOString();
  const yEnd = todayStart;

  let mentionsToday = 0;
  let mentionsYesterday = 0;
  const negativeSamples: string[] = [];
  const highReach: string[] = [];
  const competitors = new Set<string>();

  for (const brand of brands) {
    for (const c of brand.metadata.competitors ?? []) competitors.add(c);
    const mentions = await getBrandMentions(brand.id);
    for (const m of mentions) {
      if (m.createdAt >= todayStart) mentionsToday += 1;
      else if (m.createdAt >= yStart && m.createdAt < yEnd) mentionsYesterday += 1;
      if (m.sentiment === "negative" && negativeSamples.length < 3) {
        negativeSamples.push(
          `${brand.name}: ${(m.title ?? m.snippet ?? "").slice(0, 100)}`,
        );
      }
      const views = m.metrics.views ?? 0;
      if (views >= 10_000 && highReach.length < 3) {
        highReach.push(
          `${m.author ? `@${m.author}` : "Someone"} mentioned ${brand.name} (${views.toLocaleString()} views)`,
        );
      }
    }
  }

  const topTrends = (report?.trends ?? []).slice(0, 8).map((t) => ({
    title: t.title,
    heat: t.heatScore,
    category: t.category,
    sound: t.soundOrFormat,
    insight: t.insight,
  }));

  return {
    dash,
    reportDate: report?.reportDate ?? today,
    summary: report?.summary ?? null,
    topTrends,
    mentionsToday,
    mentionsYesterday,
    negativeSamples,
    highReach,
    competitors: [...competitors].slice(0, 8),
    brandNames: brands.map((b) => b.name),
  };
}

function templateBrief(ctx: Awaited<ReturnType<typeof gatherContext>>): MorningBriefContent {
  const bullets: string[] = [];

  if (ctx.summary) bullets.push(ctx.summary);

  for (const t of ctx.topTrends.slice(0, 3)) {
    bullets.push(
      `“${t.title.slice(0, 70)}” is showing heat ${t.heat} in ${t.category}${t.sound ? ` (sound/format: ${t.sound})` : ""}.`,
    );
  }

  if (ctx.mentionsToday > 0) {
    const delta = ctx.mentionsToday - ctx.mentionsYesterday;
    bullets.push(
      `Your brands picked up ${ctx.mentionsToday} mention${ctx.mentionsToday === 1 ? "" : "s"} today` +
        (delta !== 0
          ? ` (${delta > 0 ? "+" : ""}${delta} vs yesterday).`
          : "."),
    );
  } else if (ctx.brandNames.length) {
    bullets.push("No new brand mentions indexed yet today — run monitoring to refresh.");
  } else {
    bullets.push("Add a brand to include mention and competitor signals in your brief.");
  }

  for (const h of ctx.highReach.slice(0, 2)) bullets.push(h);
  for (const n of ctx.negativeSamples.slice(0, 1)) {
    bullets.push(`Watch: possible complaint/risk signal — ${n}`);
  }

  if (ctx.dash.kpis.highRiskAlerts > 0) {
    bullets.push(
      `${ctx.dash.kpis.highRiskAlerts} high-risk alert${ctx.dash.kpis.highRiskAlerts === 1 ? "" : "s"} need review.`,
    );
  }

  const opportunity =
    ctx.topTrends[0] && ctx.brandNames[0]
      ? `Opportunity: consider adapting “${ctx.topTrends[0].title.slice(0, 60)}” for ${ctx.brandNames[0]} before competitors saturate the format.`
      : ctx.topTrends[0]
        ? `Opportunity: “${ctx.topTrends[0].title.slice(0, 60)}” is still early — most industries have not entered it yet.`
        : null;

  return {
    headline: "Morning Brief",
    intro: "Here's what changed overnight.",
    bullets: bullets.slice(0, 8),
    opportunity,
    generatedAt: new Date().toISOString(),
    source: "template",
  };
}

async function openaiBrief(
  ctx: Awaited<ReturnType<typeof gatherContext>>,
): Promise<MorningBriefContent | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an AI internet intelligence analyst writing a morning brief for a marketer.
Return JSON:
{
  "intro": string (one short line like "Here's what changed overnight."),
  "bullets": string[] (5-8 punchy bullets — what moved, sounds, Reddit/news signals, brand mentions, competitor notes, complaints),
  "opportunity": string | null (one concrete "nobody has entered X yet" style opportunity)
}
Be specific. Do not invent metrics not in the input. If data is thin, say so honestly.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            reportDate: ctx.reportDate,
            reportSummary: ctx.summary,
            topTrends: ctx.topTrends,
            brandNames: ctx.brandNames,
            mentionsToday: ctx.mentionsToday,
            mentionsYesterday: ctx.mentionsYesterday,
            highReach: ctx.highReach,
            negativeSamples: ctx.negativeSamples,
            competitors: ctx.competitors,
            kpis: ctx.dash.kpis,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      intro?: string;
      bullets?: unknown;
      opportunity?: string | null;
    };

    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
      : [];

    if (bullets.length === 0) return null;

    return {
      headline: "Morning Brief",
      intro: typeof parsed.intro === "string" ? parsed.intro : "Here's what changed overnight.",
      bullets: bullets.slice(0, 8),
      opportunity:
        typeof parsed.opportunity === "string" && parsed.opportunity.trim()
          ? parsed.opportunity.trim()
          : null,
      generatedAt: new Date().toISOString(),
      source: "openai",
    };
  } catch (err) {
    console.warn("[brief] OpenAI failed:", err);
    return null;
  }
}

/**
 * Load or generate today's morning brief for the signed-in user.
 */
export async function getOrCreateMorningBrief(userId: string): Promise<MorningBriefContent> {
  const briefDate = getTodayDateString();
  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("daily_briefs")
    .select("content")
    .eq("user_id", userId)
    .eq("brief_date", briefDate)
    .maybeSingle();

  if (cached?.content && typeof cached.content === "object") {
    const c = cached.content as MorningBriefContent;
    if (Array.isArray(c.bullets) && c.bullets.length > 0) return c;
  }

  const ctx = await gatherContext();
  const content = (await openaiBrief(ctx)) ?? templateBrief(ctx);

  await supabase.from("daily_briefs").upsert(
    {
      user_id: userId,
      brief_date: briefDate,
      content,
    },
    { onConflict: "user_id,brief_date" },
  );

  return content;
}

/** Force regenerate (e.g. refresh button). */
export async function regenerateMorningBrief(userId: string): Promise<MorningBriefContent> {
  const briefDate = getTodayDateString();
  const supabase = await createClient();
  await supabase
    .from("daily_briefs")
    .delete()
    .eq("user_id", userId)
    .eq("brief_date", briefDate);
  return getOrCreateMorningBrief(userId);
}
