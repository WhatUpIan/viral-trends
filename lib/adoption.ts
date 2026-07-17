import OpenAI from "openai";
import {
  linkEntities,
  listEntities,
  upsertEntity,
  slugify,
  type Entity,
} from "@/lib/entities";
import {
  INDUSTRIES,
  detectIndustriesFromText,
  industryTopicSlug,
  type Industry,
} from "@/lib/industries";
import { getSupabaseAdmin } from "@/lib/supabase";

export type IndustryStat = {
  industry: string;
  brandCount: number;
  creatorCount: number;
  evidenceCount: number;
};

/**
 * Batch-classify trend titles into industries (OpenAI when available, else heuristics).
 */
export async function classifyTrendIndustries(
  items: { id: string; title: string; category?: string }[],
): Promise<Map<string, Industry[]>> {
  const out = new Map<string, Industry[]>();
  for (const item of items) {
    out.set(
      item.id,
      detectIndustriesFromText(`${item.title} ${item.category ?? ""}`, 2),
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || items.length === 0) return out;

  try {
    const openai = new OpenAI({ apiKey });
    const slice = items.slice(0, 40);
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Assign 0-2 industries to each short-form trend from this list only: ${INDUSTRIES.join(", ")}.
Return JSON: { "items": [{ "id": string, "industries": string[] }] }.
Only use industries that clearly apply. Empty array is fine.`,
        },
        {
          role: "user",
          content: JSON.stringify(
            slice.map((i) => ({ id: i.id, title: i.title, category: i.category })),
          ),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { items?: { id?: string; industries?: unknown }[] };
    const allowed = new Set<string>(INDUSTRIES);

    for (const row of parsed.items ?? []) {
      if (!row.id || !Array.isArray(row.industries)) continue;
      const industries = row.industries
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => allowed.has(x)) as Industry[];
      if (industries.length > 0) out.set(row.id, industries.slice(0, 2));
    }
  } catch (err) {
    console.warn("[adoption] industry classify failed:", err);
  }

  return out;
}

/** Ensure industry topic entity exists and link trend → topic. */
export async function linkTrendToIndustries(
  trendEntityId: string,
  industries: Industry[],
  evidence?: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  for (const industry of industries) {
    const topic = await upsertEntity(
      {
        type: "topic",
        name: industry,
        slug: industryTopicSlug(industry),
        attrs: { kind: "industry", industry },
        status: "stable",
      },
      supabase,
    );
    if (topic) {
      await linkEntities(
        trendEntityId,
        topic.id,
        "about_topic",
        { evidence: { ...evidence, industry } },
        supabase,
      );
    }
  }
}

/**
 * Recompute trend_industry_stats from entity_edges.
 * - brand_count: brands/companies with adopted_by → trend, plus brands in_industry matching
 * - creator_count: creators linked created_by
 * - evidence_count: about_topic industry edges + adopted_by edges
 */
export async function recomputeTrendIndustryStats(
  trendEntityIds?: string[],
): Promise<{ trendsUpdated: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { trendsUpdated: 0 };

  let trends: Entity[];
  if (trendEntityIds?.length) {
    trends = [];
    for (const id of trendEntityIds) {
      const { data } = await supabase.from("entities").select("*").eq("id", id).maybeSingle();
      if (data) {
        trends.push({
          id: data.id as string,
          type: data.type as Entity["type"],
          slug: data.slug as string,
          name: data.name as string,
          attrs: (data.attrs as Record<string, unknown>) ?? {},
          metrics: {},
          firstSeenAt: (data.first_seen_at as string) ?? null,
          peakAt: (data.peak_at as string) ?? null,
          status: (data.status as Entity["status"]) ?? "unknown",
          ownerUserId: (data.owner_user_id as string) ?? null,
        });
      }
    }
  } else {
    trends = await listEntities({ type: "trend", limit: 120, orderBy: "heat" });
  }

  let trendsUpdated = 0;

  for (const trend of trends) {
    try {
      // Outbound: about_topic → industry topics
      const { data: outEdges } = await supabase
        .from("entity_edges")
        .select("relation, to_entity_id, entities:to_entity_id(id, type, name, slug, attrs)")
        .eq("from_entity_id", trend.id);

      // Inbound: adopted_by / created_by pointing at trend
      const { data: inEdges } = await supabase
        .from("entity_edges")
        .select("relation, from_entity_id, entities:from_entity_id(id, type, name, slug, attrs)")
        .eq("to_entity_id", trend.id);

      const industryEvidence = new Map<string, { brands: Set<string>; creators: Set<string>; evidence: number }>();

      for (const ind of INDUSTRIES) {
        industryEvidence.set(ind, { brands: new Set(), creators: new Set(), evidence: 0 });
      }

      for (const edge of outEdges ?? []) {
        const ent = edge.entities as unknown;
        if (!ent || typeof ent !== "object" || Array.isArray(ent)) continue;
        const e = ent as { id: string; type: string; name: string; attrs?: Record<string, unknown> };
        if (edge.relation === "about_topic" && e.type === "topic") {
          const industry =
            typeof e.attrs?.industry === "string"
              ? e.attrs.industry
              : INDUSTRIES.find((i) => i.toLowerCase() === e.name.toLowerCase());
          if (industry && industryEvidence.has(industry)) {
            const row = industryEvidence.get(industry)!;
            row.evidence += 1;
          }
        }
        if (edge.relation === "adopted_by" && (e.type === "brand" || e.type === "company")) {
          // uncommon direction — still count
          const industries = detectIndustriesFromText(
            `${e.name} ${JSON.stringify(e.attrs ?? {})}`,
            2,
          );
          for (const industry of industries.length ? industries : (["SaaS"] as Industry[])) {
            // only if we know industry from brand attrs
          }
          void industries;
        }
      }

      for (const edge of inEdges ?? []) {
        const ent = edge.entities as unknown;
        if (!ent || typeof ent !== "object" || Array.isArray(ent)) continue;
        const e = ent as { id: string; type: string; name: string; attrs?: Record<string, unknown> };

        if (edge.relation === "created_by" && e.type === "creator") {
          // creators don't map to industry directly — skip brand_count
        }

        if (
          (edge.relation === "adopted_by" || edge.relation === "mentions") &&
          (e.type === "brand" || e.type === "company")
        ) {
          // Resolve brand industry from attrs or in_industry edges
          let industries: Industry[] = [];
          if (typeof e.attrs?.industry === "string") {
            industries = detectIndustriesFromText(e.attrs.industry, 1);
          }
          if (industries.length === 0) {
            const { data: brandEdges } = await supabase
              .from("entity_edges")
              .select("relation, entities:to_entity_id(name, attrs, type)")
              .eq("from_entity_id", e.id)
              .eq("relation", "in_industry");
            for (const be of brandEdges ?? []) {
              const t = be.entities as unknown;
              if (!t || typeof t !== "object" || Array.isArray(t)) continue;
              const te = t as { name: string; attrs?: { industry?: string } };
              const ind =
                typeof te.attrs?.industry === "string"
                  ? detectIndustriesFromText(te.attrs.industry, 1)[0]
                  : detectIndustriesFromText(te.name, 1)[0];
              if (ind) industries.push(ind);
            }
          }
          // Also try matching brand name / metadata products against industry aliases
          if (industries.length === 0) {
            industries = detectIndustriesFromText(
              `${e.name} ${JSON.stringify(e.attrs ?? {})}`,
              1,
            );
          }

          // If still unknown, count against industries already evidenced on the trend
          const targetIndustries =
            industries.length > 0
              ? industries
              : [...industryEvidence.entries()]
                  .filter(([, v]) => v.evidence > 0)
                  .map(([k]) => k as Industry);

          // If trend has no industry tags yet, still record a generic evidence bump on none —
          // skip inventing industry attribution
          for (const industry of targetIndustries) {
            const row = industryEvidence.get(industry);
            if (!row) continue;
            row.brands.add(e.id);
            row.evidence += 1;
          }
        }

        if (edge.relation === "created_by" && e.type === "creator") {
          for (const [, row] of industryEvidence) {
            if (row.evidence > 0) row.creators.add(e.id);
          }
        }
      }

      // Also count creators linked from trend
      for (const edge of outEdges ?? []) {
        if (edge.relation !== "created_by") continue;
        const ent = edge.entities as unknown;
        if (!ent || typeof ent !== "object" || Array.isArray(ent)) continue;
        const e = ent as { id: string; type: string };
        if (e.type !== "creator") continue;
        for (const [, row] of industryEvidence) {
          if (row.evidence > 0 || row.brands.size > 0) row.creators.add(e.id);
        }
      }

      const now = new Date().toISOString();
      const rows = INDUSTRIES.map((industry) => {
        const row = industryEvidence.get(industry)!;
        return {
          trend_entity_id: trend.id,
          industry,
          brand_count: row.brands.size,
          creator_count: row.creators.size,
          evidence_count: row.evidence + row.brands.size,
          updated_at: now,
        };
      });

      await supabase.from("trend_industry_stats").upsert(rows, {
        onConflict: "trend_entity_id,industry",
      });
      trendsUpdated += 1;
    } catch (err) {
      console.warn("[adoption] stats failed for", trend.id, err);
    }
  }

  return { trendsUpdated };
}

export async function getTrendIndustryStats(
  trendEntityId: string,
): Promise<IndustryStat[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("trend_industry_stats")
    .select("industry, brand_count, creator_count, evidence_count")
    .eq("trend_entity_id", trendEntityId);

  if (!data?.length) {
    return INDUSTRIES.map((industry) => ({
      industry,
      brandCount: 0,
      creatorCount: 0,
      evidenceCount: 0,
    }));
  }

  const byInd = new Map(
    data.map((r) => [
      r.industry as string,
      {
        industry: r.industry as string,
        brandCount: Number(r.brand_count) || 0,
        creatorCount: Number(r.creator_count) || 0,
        evidenceCount: Number(r.evidence_count) || 0,
      },
    ]),
  );

  return INDUSTRIES.map(
    (industry) =>
      byInd.get(industry) ?? {
        industry,
        brandCount: 0,
        creatorCount: 0,
        evidenceCount: 0,
      },
  );
}

/** Load known brand/company names for title matching during ingest. */
export async function loadKnownBrandNames(): Promise<
  { id: string; name: string; type: "brand" | "company"; industry?: string }[]
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("entities")
    .select("id, name, type, attrs")
    .in("type", ["brand", "company"])
    .limit(200);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: r.type as "brand" | "company",
    industry:
      typeof (r.attrs as { industry?: string } | null)?.industry === "string"
        ? (r.attrs as { industry: string }).industry
        : undefined,
  }));
}

export function findBrandHitsInText(
  text: string,
  known: { id: string; name: string; type: "brand" | "company" }[],
): { id: string; name: string; type: "brand" | "company" }[] {
  const lower = text.toLowerCase();
  return known.filter((k) => {
    const n = k.name.trim().toLowerCase();
    return n.length >= 3 && lower.includes(n);
  });
}

export { slugify };
