"use server";

import { generateBrandKeywords } from "@/lib/keyword-gen";
import { SOCIAL_PLATFORMS, normalizeHandle } from "@/lib/mentions/own-account";
import type { SocialPlatform } from "@/lib/mentions/own-account";
import { createClient, getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readSocialHandles(formData: FormData): { platform: SocialPlatform; handle: string }[] {
  const out: { platform: SocialPlatform; handle: string }[] = [];
  for (const { id } of SOCIAL_PLATFORMS) {
    const raw = String(formData.get(`${id}_handle`) ?? "").trim();
    const handle = normalizeHandle(raw);
    if (handle) out.push({ platform: id, handle: raw.replace(/^@+/, "").trim() });
  }
  return out;
}

async function saveSocialHandles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  handles: { platform: SocialPlatform; handle: string }[],
) {
  if (handles.length === 0) return;
  await supabase.from("brand_social_accounts").upsert(
    handles.map((h) => ({ brand_id: brandId, platform: h.platform, handle: h.handle })),
    { onConflict: "brand_id,platform" },
  );
}

export async function createBrand(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands/new");

  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) redirect("/brands/new?error=name_required");

  const supabase = await createClient();
  const { data: brand, error } = await supabase
    .from("brands")
    .insert({ user_id: user.id, name, website, description })
    .select("id")
    .single();

  if (error || !brand) {
    console.error("[brands] create failed:", error);
    redirect("/brands/new?error=create_failed");
  }

  const keywords = await generateBrandKeywords({ name, website, description });
  if (keywords.length > 0) {
    await supabase.from("brand_keywords").insert(
      keywords.map((keyword) => ({
        brand_id: brand.id,
        keyword,
        kind: "generated" as const,
      })),
    );
  }

  await saveSocialHandles(supabase, brand.id, readSocialHandles(formData));

  revalidatePath("/brands");
  redirect(`/brands/${brand.id}`);
}

export async function addKeyword(brandId: string, formData: FormData) {
  const keyword = String(formData.get("keyword") ?? "").trim();
  const kind = String(formData.get("kind") ?? "custom");
  if (!keyword || !["custom", "negative"].includes(kind)) return;

  const supabase = await createClient();
  await supabase
    .from("brand_keywords")
    .upsert(
      { brand_id: brandId, keyword, kind },
      { onConflict: "brand_id,keyword,kind" },
    );
  revalidatePath(`/brands/${brandId}`);
}

export async function deleteKeyword(brandId: string, keywordId: string) {
  const supabase = await createClient();
  await supabase.from("brand_keywords").delete().eq("id", keywordId);
  revalidatePath(`/brands/${brandId}`);
}

export async function regenerateKeywords(brandId: string) {
  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("name, website, description")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return;

  const keywords = await generateBrandKeywords(brand);
  if (keywords.length === 0) return;

  await supabase
    .from("brand_keywords")
    .delete()
    .eq("brand_id", brandId)
    .eq("kind", "generated");
  await supabase.from("brand_keywords").insert(
    keywords.map((keyword) => ({
      brand_id: brandId,
      keyword,
      kind: "generated" as const,
    })),
  );
  revalidatePath(`/brands/${brandId}`);
}

export async function toggleBrandStatus(brandId: string, current: string) {
  const supabase = await createClient();
  await supabase
    .from("brands")
    .update({
      status: current === "active" ? "paused" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", brandId);
  revalidatePath("/brands");
  revalidatePath(`/brands/${brandId}`);
}

export async function deleteBrand(brandId: string) {
  const supabase = await createClient();
  await supabase.from("brands").delete().eq("id", brandId);
  revalidatePath("/brands");
  redirect("/brands");
}

export async function saveSocialAccounts(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect(`/login?next=/brands/${brandId}?tab=accounts`);

  const supabase = await createClient();
  const handles = readSocialHandles(formData);

  // Clear removed platforms, then upsert provided handles
  const platforms = handles.map((h) => h.platform);
  const { data: existing } = await supabase
    .from("brand_social_accounts")
    .select("platform")
    .eq("brand_id", brandId);

  for (const row of existing ?? []) {
    if (!platforms.includes(row.platform as SocialPlatform)) {
      await supabase
        .from("brand_social_accounts")
        .delete()
        .eq("brand_id", brandId)
        .eq("platform", row.platform);
    }
  }

  if (handles.length > 0) {
    await saveSocialHandles(supabase, brandId, handles);
  }

  revalidatePath(`/brands/${brandId}`);
}
