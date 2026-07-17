import { NextResponse } from "next/server";
import { askAssistant, type AssistantMessage } from "@/lib/assistant";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { question?: string; history?: AssistantMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const question = String(body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const answer = await askAssistant(question, body.history ?? []);
  return NextResponse.json({ ok: true, answer });
}
