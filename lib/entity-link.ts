import {
  classifyTrendIndustries,
  findBrandHitsInText,
  linkTrendToIndustries,
  loadKnownBrandNames,
  recomputeTrendIndustryStats,
} from "@/lib/adoption";
import {
  linkEntities,
  upsertEntity,
  slugify,
  type EntityStatus,
} from "@/lib/entities";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { PersistTrendInput } from "@/lib/reports";

function heatStatus(heat: number): EntityStatus {
  if (heat >= 90) return "peaking";
  if (heat >= 75) return "rising";
  if (heat >= 55) return "emerging";
  return "stable";
}

/**
 * Best-effort: upsert trend/creator/sound/video/industry entities and edges after a daily report.
 * Skips silently on failure so cron never fails because of the graph.
 */
export async function linkReportEntities(opts: {
  reportId: string;
  reportDate: string;
  trends: PersistTrendInput[];
}): Promise<{ linked: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { linked: 0 };

  let linked = 0;
  const slice = [...opts.trends]
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, 40);

  const knownBrands = await loadKnownBrandNames();

  // Batch industry classification for the slice
  const industryMap = await classifyTrendIndustries(
    slice.map((t) => ({
      id: `${t.platform}:${t.externalId}`,
      title: t.title,
      category: t.category,
    })),
  );

  const trendEntityIds: string[] = [];

  for (const t of slice) {
    try {
      const trendName = t.title.slice(0, 120) || `${t.platform} ${t.externalId}`;
      const trendSlug = slugify(`${t.platform}-${t.externalId}`);
      const trendEntity = await upsertEntity(
        {
          type: "trend",
          name: trendName,
          slug: trendSlug,
          attrs: {
            platform: t.platform,
            externalId: t.externalId,
            url: t.url,
            category: t.category,
            reportDate: opts.reportDate,
          },
          metrics: {
            heat: t.heatScore,
            views: t.metrics.views ?? 0,
            likes: t.metrics.likes ?? 0,
          },
          status: heatStatus(t.heatScore),
          peakAt: t.heatScore >= 85 ? new Date().toISOString() : null,
        },
        supabase,
      );
      if (!trendEntity) continue;
      trendEntityIds.push(trendEntity.id);

      await supabase
        .from("trends")
        .update({ entity_id: trendEntity.id })
        .eq("report_id", opts.reportId)
        .eq("platform", t.platform)
        .eq("external_id", t.externalId);

      // Video node
      const video = await upsertEntity(
        {
          type: "video",
          name: trendName,
          slug: slugify(`video-${t.platform}-${t.externalId}`),
          attrs: {
            platform: t.platform,
            externalId: t.externalId,
            url: t.url,
          },
          metrics: {
            views: t.metrics.views ?? 0,
            likes: t.metrics.likes ?? 0,
            heat: t.heatScore,
          },
          status: heatStatus(t.heatScore),
        },
        supabase,
      );
      if (video) {
        await linkEntities(
          video.id,
          trendEntity.id,
          "appears_in",
          { evidence: { reportDate: opts.reportDate } },
          supabase,
        );
      }

      if (t.creatorHandle?.trim()) {
        const creator = await upsertEntity(
          {
            type: "creator",
            name: t.creatorHandle.replace(/^@/, ""),
            slug: slugify(`${t.platform}-${t.creatorHandle}`),
            attrs: { platform: t.platform, handle: t.creatorHandle },
            status: "stable",
          },
          supabase,
        );
        if (creator) {
          await linkEntities(
            trendEntity.id,
            creator.id,
            "created_by",
            { evidence: { reportDate: opts.reportDate, url: t.url } },
            supabase,
          );
          if (video) {
            await linkEntities(
              video.id,
              creator.id,
              "created_by",
              { evidence: { reportDate: opts.reportDate } },
              supabase,
            );
          }
        }
      }

      if (t.soundOrFormat?.trim()) {
        const sound = await upsertEntity(
          {
            type: "sound",
            name: t.soundOrFormat.trim(),
            attrs: { platform: t.platform },
            metrics: { heat: t.heatScore },
            status: heatStatus(t.heatScore),
          },
          supabase,
        );
        if (sound) {
          await linkEntities(
            trendEntity.id,
            sound.id,
            "uses_sound",
            { evidence: { reportDate: opts.reportDate } },
            supabase,
          );
        }
      }

      // Category topic
      const topic = await upsertEntity(
        {
          type: "topic",
          name: t.category,
          slug: slugify(t.category),
          status: "stable",
        },
        supabase,
      );
      if (topic) {
        await linkEntities(
          trendEntity.id,
          topic.id,
          "about_topic",
          { evidence: { reportDate: opts.reportDate } },
          supabase,
        );
      }

      // Industry topics from classifier
      const industries =
        industryMap.get(`${t.platform}:${t.externalId}`) ?? [];
      if (industries.length > 0) {
        await linkTrendToIndustries(trendEntity.id, industries, {
          reportDate: opts.reportDate,
          source: "ingest_classify",
        });
      }

      // Brand/company name hits in title → adopted_by (brand → trend)
      const hits = findBrandHitsInText(t.title, knownBrands);
      for (const hit of hits.slice(0, 3)) {
        await linkEntities(
          hit.id,
          trendEntity.id,
          "adopted_by",
          { evidence: { reportDate: opts.reportDate, matchedIn: "title" } },
          supabase,
        );
      }

      linked += 1;
    } catch (err) {
      console.warn("[entity-link] trend skip:", err);
    }
  }

  try {
    await recomputeTrendIndustryStats(trendEntityIds);
  } catch (err) {
    console.warn("[entity-link] adoption recompute failed:", err);
  }

  return { linked };
}

/**
 * Best-effort: upsert creator entity for a social mention author.
 */
export async function linkMentionCreator(opts: {
  mentionId: string;
  author: string | null;
  platform: string | null;
}): Promise<void> {
  if (!opts.author?.trim()) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const handle = opts.author.replace(/^@/, "").trim();
    const creator = await upsertEntity(
      {
        type: "creator",
        name: handle,
        slug: slugify(`${opts.platform ?? "social"}-${handle}`),
        attrs: { platform: opts.platform, handle },
        status: "stable",
      },
      supabase,
    );
    if (!creator) return;
    await supabase
      .from("brand_mentions")
      .update({ entity_id: creator.id })
      .eq("id", opts.mentionId);
  } catch (err) {
    console.warn("[entity-link] mention creator skip:", err);
  }
}

/**
 * Link a brand entity to matching trend entities + news coverage from a mention.
 */
export async function linkMentionToGraph(opts: {
  brandId: string;
  brandName: string;
  brandEntityId: string | null;
  industry?: string | null;
  mention: {
    id: string;
    title: string | null;
    snippet: string | null;
    url: string;
    platform: string | null;
    source: string;
    author: string | null;
  };
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    let brandEntityId = opts.brandEntityId;
    if (!brandEntityId) {
      const entity = await upsertEntity(
        {
          type: "brand",
          name: opts.brandName,
          slug: slugify(`${opts.brandName}-${opts.brandId.slice(0, 8)}`),
          attrs: {
            brandId: opts.brandId,
            industry: opts.industry ?? null,
          },
          status: "stable",
        },
        supabase,
      );
      brandEntityId = entity?.id ?? null;
      if (brandEntityId) {
        await supabase
          .from("brands")
          .update({ entity_id: brandEntityId })
          .eq("id", opts.brandId);
      }
    }
    if (!brandEntityId) return;

    // Brand → industry topic
    if (opts.industry) {
      const { detectIndustriesFromText, industryTopicSlug } = await import(
        "@/lib/industries"
      );
      const ind = detectIndustriesFromText(opts.industry, 1)[0];
      if (ind) {
        const topic = await upsertEntity(
          {
            type: "topic",
            name: ind,
            slug: industryTopicSlug(ind),
            attrs: { kind: "industry", industry: ind },
            status: "stable",
          },
          supabase,
        );
        if (topic) {
          await linkEntities(brandEntityId, topic.id, "in_industry", {
            evidence: { source: "brand_metadata" },
          }, supabase);
        }
      }
    }

    const text = `${opts.mention.title ?? ""} ${opts.mention.snippet ?? ""}`.toLowerCase();

    // Match recent trend entities by name substring (cheap, capped)
    const { data: trends } = await supabase
      .from("entities")
      .select("id, name")
      .eq("type", "trend")
      .order("updated_at", { ascending: false })
      .limit(60);

    const matched = (trends ?? []).filter((t) => {
      const n = String(t.name).toLowerCase();
      return n.length >= 8 && text.includes(n.slice(0, Math.min(40, n.length)));
    });

    for (const t of matched.slice(0, 3)) {
      await linkEntities(
        brandEntityId,
        t.id as string,
        "adopted_by",
        { evidence: { mentionId: opts.mention.id, url: opts.mention.url } },
        supabase,
      );
    }

    // News coverage entity
    if (opts.mention.platform === "news" || opts.mention.source === "web") {
      const news = await upsertEntity(
        {
          type: "news",
          name: (opts.mention.title ?? opts.brandName).slice(0, 120),
          slug: slugify(`news-${opts.mention.id}`),
          attrs: { url: opts.mention.url, platform: opts.mention.platform },
          status: "stable",
        },
        supabase,
      );
      if (news) {
        await linkEntities(
          news.id,
          brandEntityId,
          "covered_by",
          { evidence: { mentionId: opts.mention.id } },
          supabase,
        );
      }
    }
  } catch (err) {
    console.warn("[entity-link] mention graph skip:", err);
  }
}
