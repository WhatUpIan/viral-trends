import { runMentionsIngest } from "@/lib/mentions/ingest";
import { createClient, getUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manual brand scan for the signed-in user.
 * Body: { brandId?: string } — omit to scan all of the user's active brands.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let brandId: string | undefined;
  try {
    const body = (await request.json()) as { brandId?: string };
    brandId = body.brandId;
  } catch {
    // empty body is fine — scan all active brands for this user
  }

  const supabase = await createClient();
  let query = supabase
    .from("brands")
    .select("id, status")
    .eq("user_id", user.id);

  if (brandId) {
    query = query.eq("id", brandId);
  } else {
    query = query.eq("status", "active");
  }

  const { data: brands, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!brands || brands.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: brandId
          ? "Brand not found"
          : "No active brands to scan. Resume a brand or pass a brandId.",
        brandsProcessed: 0,
        mentionsUpserted: 0,
        commentsUpserted: 0,
      },
      { status: 404 },
    );
  }

  // Manual run activates a paused brand so cron keeps covering it afterward
  const ids = brands.map((b) => b.id);
  const paused = brands.filter((b) => b.status === "paused").map((b) => b.id);
  if (paused.length > 0) {
    await supabase
      .from("brands")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .in("id", paused);
  }

  const result = await runMentionsIngest({ brandIds: ids });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
