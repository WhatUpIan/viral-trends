import { NextResponse } from "next/server";
import { getEntity, type EntityType } from "@/lib/entities";
import { askAboutEntity, type ChatMessage } from "@/lib/entity-chat";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES: EntityType[] = [
  "brand",
  "trend",
  "creator",
  "sound",
  "video",
  "product",
  "company",
  "topic",
  "keyword",
  "meme",
  "news",
];

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    question?: string;
    type?: string;
    slug?: string;
    history?: ChatMessage[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const question = String(body.question ?? "").trim();
  const type = String(body.type ?? "trend").trim() as EntityType;
  const slug = String(body.slug ?? "").trim();
  if (!question || !slug) {
    return NextResponse.json({ error: "question and slug required" }, { status: 400 });
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  const entity = await getEntity(type, slug);
  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  const answer = await askAboutEntity(entity, question, body.history ?? []);
  return NextResponse.json({ ok: true, answer });
}
