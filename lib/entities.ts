import { getSupabaseAdmin } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EntityType =
  | "brand"
  | "trend"
  | "creator"
  | "sound"
  | "video"
  | "product"
  | "company"
  | "topic"
  | "keyword"
  | "meme"
  | "news";

export type EntityStatus =
  | "emerging"
  | "rising"
  | "peaking"
  | "declining"
  | "stable"
  | "unknown";

export type Entity = {
  id: string;
  type: EntityType;
  slug: string;
  name: string;
  attrs: Record<string, unknown>;
  metrics: Record<string, number>;
  firstSeenAt: string | null;
  peakAt: string | null;
  status: EntityStatus;
  ownerUserId: string | null;
};

export type EntityRelation =
  | "mentions"
  | "competes_with"
  | "uses_sound"
  | "created_by"
  | "about_topic"
  | "appears_in"
  | "related_keyword"
  | "sells_product"
  | "adopted_by"
  | "in_industry"
  | "covered_by";

/** URL-safe slug from a display name */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "unnamed";
}

function clientOrNull(supabase?: SupabaseClient): SupabaseClient | null {
  return supabase ?? getSupabaseAdmin();
}

function mapEntity(row: Record<string, unknown>): Entity {
  const metricsRaw = row.metrics;
  const metrics: Record<string, number> = {};
  if (metricsRaw && typeof metricsRaw === "object" && !Array.isArray(metricsRaw)) {
    for (const [k, v] of Object.entries(metricsRaw as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) metrics[k] = v;
    }
  }
  return {
    id: row.id as string,
    type: row.type as EntityType,
    slug: row.slug as string,
    name: row.name as string,
    attrs:
      row.attrs && typeof row.attrs === "object" && !Array.isArray(row.attrs)
        ? (row.attrs as Record<string, unknown>)
        : {},
    metrics,
    firstSeenAt: (row.first_seen_at as string) ?? null,
    peakAt: (row.peak_at as string) ?? null,
    status: (row.status as EntityStatus) ?? "unknown",
    ownerUserId: (row.owner_user_id as string) ?? null,
  };
}

export async function upsertEntity(
  input: {
    type: EntityType;
    name: string;
    slug?: string;
    attrs?: Record<string, unknown>;
    metrics?: Record<string, number>;
    status?: EntityStatus;
    firstSeenAt?: string | null;
    peakAt?: string | null;
    ownerUserId?: string | null;
  },
  supabase?: SupabaseClient,
): Promise<Entity | null> {
  const db = clientOrNull(supabase);
  if (!db) return null;

  const slug = input.slug ?? slugify(input.name);
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("entities")
    .select("*")
    .eq("type", input.type)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const prevMetrics =
      existing.metrics && typeof existing.metrics === "object"
        ? (existing.metrics as Record<string, number>)
        : {};
    const mergedMetrics = { ...prevMetrics, ...(input.metrics ?? {}) };
    const prevAttrs =
      existing.attrs && typeof existing.attrs === "object"
        ? (existing.attrs as Record<string, unknown>)
        : {};
    const mergedAttrs = { ...prevAttrs, ...(input.attrs ?? {}) };

    const { data, error } = await db
      .from("entities")
      .update({
        name: input.name,
        attrs: mergedAttrs,
        metrics: mergedMetrics,
        status: input.status ?? existing.status,
        first_seen_at: existing.first_seen_at ?? input.firstSeenAt ?? now,
        peak_at: input.peakAt ?? existing.peak_at,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      console.warn("[entities] update failed:", error?.message);
      return mapEntity(existing);
    }
    return mapEntity(data);
  }

  const { data, error } = await db
    .from("entities")
    .insert({
      type: input.type,
      slug,
      name: input.name,
      attrs: input.attrs ?? {},
      metrics: input.metrics ?? {},
      status: input.status ?? "unknown",
      first_seen_at: input.firstSeenAt ?? now,
      peak_at: input.peakAt ?? null,
      owner_user_id: input.ownerUserId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.warn("[entities] insert failed:", error?.message);
    return null;
  }
  return mapEntity(data);
}

export async function linkEntities(
  fromId: string,
  toId: string,
  relation: EntityRelation,
  opts?: { weight?: number; evidence?: Record<string, unknown> },
  supabase?: SupabaseClient,
): Promise<void> {
  if (fromId === toId) return;
  const db = clientOrNull(supabase);
  if (!db) return;

  const { error } = await db.from("entity_edges").upsert(
    {
      from_entity_id: fromId,
      to_entity_id: toId,
      relation,
      weight: opts?.weight ?? 1,
      evidence: opts?.evidence ?? {},
    },
    { onConflict: "from_entity_id,to_entity_id,relation" },
  );
  if (error) console.warn("[entities] link failed:", error.message);
}

export async function getEntity(
  type: EntityType,
  slug: string,
  supabase?: SupabaseClient,
): Promise<Entity | null> {
  const db = clientOrNull(supabase);
  if (!db) return null;
  const { data } = await db
    .from("entities")
    .select("*")
    .eq("type", type)
    .eq("slug", slug)
    .maybeSingle();
  return data ? mapEntity(data) : null;
}

export async function getEntityById(
  id: string,
  supabase?: SupabaseClient,
): Promise<Entity | null> {
  const db = clientOrNull(supabase);
  if (!db) return null;
  const { data } = await db.from("entities").select("*").eq("id", id).maybeSingle();
  return data ? mapEntity(data) : null;
}

export async function listRelated(
  entityId: string,
  relation?: EntityRelation,
  supabase?: SupabaseClient,
): Promise<{ entity: Entity; relation: string; weight: number }[]> {
  const db = clientOrNull(supabase);
  if (!db) return [];

  let q = db
    .from("entity_edges")
    .select("relation, weight, to_entity_id, entities:to_entity_id(*)")
    .eq("from_entity_id", entityId);

  if (relation) q = q.eq("relation", relation);

  const { data, error } = await q;
  if (error || !data) return [];

  return data
    .map((row) => {
      const raw = row.entities as unknown;
      const ent =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : null;
      if (!ent) return null;
      return {
        entity: mapEntity(ent),
        relation: row.relation as string,
        weight: Number(row.weight) || 1,
      };
    })
    .filter((x): x is { entity: Entity; relation: string; weight: number } => x !== null);
}

/** Also load inbound edges (entities that point at this one). */
export async function listRelatedBothWays(
  entityId: string,
  supabase?: SupabaseClient,
): Promise<{ entity: Entity; relation: string; weight: number; direction: "out" | "in" }[]> {
  const db = clientOrNull(supabase);
  if (!db) return [];

  const out = await listRelated(entityId, undefined, db);
  const { data: inbound } = await db
    .from("entity_edges")
    .select("relation, weight, from_entity_id, entities:from_entity_id(*)")
    .eq("to_entity_id", entityId);

  const inboundMapped =
    inbound?.map((row) => {
      const raw = row.entities as unknown;
      const ent =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : null;
      if (!ent) return null;
      return {
        entity: mapEntity(ent),
        relation: row.relation as string,
        weight: Number(row.weight) || 1,
        direction: "in" as const,
      };
    }).filter(
      (x): x is { entity: Entity; relation: string; weight: number; direction: "in" } =>
        x !== null,
    ) ?? [];

  return [
    ...out.map((r) => ({ ...r, direction: "out" as const })),
    ...inboundMapped,
  ];
}

export async function listEntities(opts: {
  type?: EntityType;
  status?: EntityStatus;
  limit?: number;
  orderBy?: "updated" | "heat" | "name";
}): Promise<Entity[]> {
  const db = clientOrNull();
  if (!db) return [];

  let q = db.from("entities").select("*").limit(opts.limit ?? 60);

  if (opts.type) q = q.eq("type", opts.type);
  if (opts.status) q = q.eq("status", opts.status);

  if (opts.orderBy === "name") {
    q = q.order("name", { ascending: true });
  } else if (opts.orderBy === "heat") {
    // heat lives in metrics jsonb — fallback to updated_at
    q = q.order("updated_at", { ascending: false });
  } else {
    q = q.order("updated_at", { ascending: false });
  }

  const { data, error } = await q;
  if (error || !data) return [];

  let entities = data.map(mapEntity);
  if (opts.orderBy === "heat") {
    entities = [...entities].sort(
      (a, b) => (b.metrics.heat ?? b.metrics.views ?? 0) - (a.metrics.heat ?? a.metrics.views ?? 0),
    );
  }
  return entities;
}

/** Simple ILIKE search across entity names (and optional type filter). */
export async function searchEntities(
  query: string,
  opts?: { types?: EntityType[]; limit?: number },
): Promise<Entity[]> {
  const q = query.trim();
  if (!q) return [];
  const db = clientOrNull();
  if (!db) return [];

  let req = db
    .from("entities")
    .select("*")
    .ilike("name", `%${q}%`)
    .limit(opts?.limit ?? 40)
    .order("updated_at", { ascending: false });

  if (opts?.types && opts.types.length === 1) {
    req = req.eq("type", opts.types[0]);
  }

  const { data, error } = await req;
  if (error || !data) return [];

  let entities = data.map(mapEntity);
  if (opts?.types && opts.types.length > 1) {
    const allowed = new Set(opts.types);
    entities = entities.filter((e) => allowed.has(e.type));
  }
  return entities;
}

export function entityHref(entity: Pick<Entity, "type" | "slug">): string {
  if (entity.type === "brand") {
    // Brand app routes use brand id; entity page still works as fallback
    return `/entities/brand/${entity.slug}`;
  }
  if (entity.type === "trend") return `/database/${entity.slug}`;
  return `/entities/${entity.type}/${entity.slug}`;
}

/** Match daily report item → permanent trend entity slug (same as ingest). */
export function trendEntitySlug(platform: string, externalId: string): string {
  return slugify(`${platform}-${externalId}`);
}

/**
 * Ensure a brand row has a linked brand entity. Returns entity id.
 */
export async function ensureBrandEntity(
  brand: {
    id: string;
    name: string;
    userId: string;
    website?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown>;
    entityId?: string | null;
  },
  supabase?: SupabaseClient,
): Promise<string | null> {
  const db = clientOrNull(supabase);
  if (!db) return null;

  if (brand.entityId) return brand.entityId;

  const entity = await upsertEntity(
    {
      type: "brand",
      name: brand.name,
      slug: slugify(`${brand.name}-${brand.id.slice(0, 8)}`),
      attrs: {
        website: brand.website ?? null,
        description: brand.description ?? null,
        brandId: brand.id,
        ...(brand.metadata ?? {}),
      },
      status: "stable",
      ownerUserId: brand.userId,
    },
    db,
  );
  if (!entity) return null;

  await db.from("brands").update({ entity_id: entity.id }).eq("id", brand.id);
  return entity.id;
}

/**
 * Link brand entity to competitor companies and topics from research metadata.
 */
export async function syncBrandGraph(
  brandEntityId: string,
  metadata: {
    competitors?: string[];
    products?: string[];
    industry?: string;
  },
  evidence?: Record<string, unknown>,
  supabase?: SupabaseClient,
): Promise<void> {
  const db = clientOrNull(supabase);
  if (!db) return;

  for (const name of metadata.competitors ?? []) {
    const company = await upsertEntity(
      { type: "company", name, status: "stable" },
      db,
    );
    if (company) {
      await linkEntities(brandEntityId, company.id, "competes_with", { evidence }, db);
    }
  }

  for (const name of metadata.products ?? []) {
    const product = await upsertEntity(
      { type: "product", name, status: "stable" },
      db,
    );
    if (product) {
      await linkEntities(brandEntityId, product.id, "sells_product", { evidence }, db);
    }
  }

  if (metadata.industry?.trim()) {
    const { detectIndustriesFromText, industryTopicSlug } = await import("@/lib/industries");
    const ind =
      detectIndustriesFromText(metadata.industry, 1)[0] ?? null;
    const name = ind ?? metadata.industry.trim();
    const topic = await upsertEntity(
      {
        type: "topic",
        name,
        slug: ind ? industryTopicSlug(ind) : undefined,
        attrs: ind ? { kind: "industry", industry: ind } : {},
        status: "stable",
      },
      db,
    );
    if (topic) {
      await linkEntities(brandEntityId, topic.id, "about_topic", { evidence }, db);
      await linkEntities(brandEntityId, topic.id, "in_industry", { evidence }, db);
    }
  }
}
