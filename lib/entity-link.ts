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
 * Best-effort: upsert trend/creator/sound entities and edges after a daily report persist.
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
  // Cap work for Hobby 60s cron — link top heat items only
  const slice = [...opts.trends]
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, 40);

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

      await supabase
        .from("trends")
        .update({ entity_id: trendEntity.id })
        .eq("report_id", opts.reportId)
        .eq("platform", t.platform)
        .eq("external_id", t.externalId);

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

      // Topic from category
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

      linked += 1;
    } catch (err) {
      console.warn("[entity-link] trend skip:", err);
    }
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
