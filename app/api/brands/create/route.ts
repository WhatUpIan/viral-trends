import { SOCIAL_PLATFORMS, normalizeHandle } from "@/lib/mentions/own-account";
import type { SocialPlatform } from "@/lib/mentions/own-account";
import type { BrandMetadata } from "@/lib/brands";
import { ensureBrandEntity, syncBrandGraph } from "@/lib/entities";
import { createClient, getUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readSocialHandles(formData: FormData): { platform: SocialPlatform; handle: string }[] {
  const out: { platform: SocialPlatform; handle: string }[] = [];
  for (const { id } of SOCIAL_PLATFORMS) {
    const raw = String(formData.get(`${id}_handle`) ?? "").trim();
    const handle = normalizeHandle(raw);
    if (handle) out.push({ platform: id, handle: raw.replace(/^@+/, "").trim() });
  }
  return out;
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseMetadata(raw: string): BrandMetadata {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as BrandMetadata;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const keywords = parseJsonArray(String(formData.get("keywords") ?? "[]"));
  const negativeKeywords = parseJsonArray(String(formData.get("negativeKeywords") ?? "[]"));
  const metadata = parseMetadata(String(formData.get("metadata") ?? "{}"));

  if (!name) {
    return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: brand, error } = await supabase
    .from("brands")
    .insert({ user_id: user.id, name, website, description, metadata })
    .select("id")
    .single();

  if (error || !brand) {
    console.error("[brands] create failed:", error);
    return NextResponse.json({ error: "Could not create brand" }, { status: 500 });
  }

  const keywordRows = [
    ...keywords.map((keyword) => ({
      brand_id: brand.id,
      keyword,
      kind: "generated" as const,
    })),
    ...negativeKeywords.map((keyword) => ({
      brand_id: brand.id,
      keyword,
      kind: "negative" as const,
    })),
  ];

  if (keywordRows.length > 0) {
    await supabase.from("brand_keywords").insert(keywordRows);
  }

  const handles = readSocialHandles(formData);
  if (handles.length > 0) {
    await supabase.from("brand_social_accounts").upsert(
      handles.map((h) => ({ brand_id: brand.id, platform: h.platform, handle: h.handle })),
      { onConflict: "brand_id,platform" },
    );
  }

  try {
    const entityId = await ensureBrandEntity(
      {
        id: brand.id,
        name,
        userId: user.id,
        website,
        description,
        metadata: metadata as Record<string, unknown>,
      },
      supabase,
    );
    if (entityId) {
      await syncBrandGraph(
        entityId,
        {
          competitors: metadata.competitors,
          products: metadata.products,
          industry: metadata.industry,
        },
        { source: "brand_create" },
        supabase,
      );
    }
  } catch (err) {
    console.warn("[brands] entity graph sync failed:", err);
  }

  return NextResponse.json({ ok: true, brandId: brand.id });
}
