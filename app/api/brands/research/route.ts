import { researchBrand } from "@/lib/brand-research";
import { getUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let name = "";
  let website = "";
  try {
    const body = (await request.json()) as { name?: string; website?: string };
    name = String(body.name ?? "").trim();
    website = String(body.website ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  }
  if (!website) {
    return NextResponse.json({ error: "Website URL is required" }, { status: 400 });
  }

  try {
    const result = await researchBrand({ name, website });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
