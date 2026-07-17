import { isAdminEmail } from "@/lib/admin";
import { runDailyIngest } from "@/lib/ingest";
import { getUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** Hobby: up to 60s. Same as cron ingest. */
export const maxDuration = 60;

/**
 * Manual daily trends ingest — signed-in admin only.
 */
export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const result = await runDailyIngest();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
