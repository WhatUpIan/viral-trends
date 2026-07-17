import OpenAI from "openai";
import type { Entity } from "@/lib/entities";
import { listRelatedBothWays } from "@/lib/entities";

export type ChatMessage = { role: "user" | "assistant"; content: string };

function entityContext(entity: Entity, related: Awaited<ReturnType<typeof listRelatedBothWays>>) {
  return {
    type: entity.type,
    name: entity.name,
    status: entity.status,
    firstSeenAt: entity.firstSeenAt,
    peakAt: entity.peakAt,
    metrics: entity.metrics,
    attrs: entity.attrs,
    related: related.slice(0, 20).map((r) => ({
      direction: r.direction,
      relation: r.relation,
      type: r.entity.type,
      name: r.entity.name,
    })),
  };
}

/**
 * Answer a question about a specific entity (trend, creator, sound, etc.).
 */
export async function askAboutEntity(
  entity: Entity,
  question: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const related = await listRelatedBothWays(entity.id);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return heuristicAnswer(entity, question, related);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are an internet intelligence analyst for marketers and creators.
Answer questions about the given entity using only the provided context.
Be concrete and actionable. If data is missing, say so — do not invent view counts or brand names.
Keep answers under 180 words unless the user asks for detail.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            entity: entityContext(entity, related),
            question,
            prior: history.slice(-6),
          }),
        },
      ],
    });

    return (
      completion.choices[0]?.message?.content?.trim() ||
      heuristicAnswer(entity, question, related)
    );
  } catch (err) {
    console.warn("[entity-chat] OpenAI failed:", err);
    return heuristicAnswer(entity, question, related);
  }
}

function heuristicAnswer(
  entity: Entity,
  question: string,
  related: Awaited<ReturnType<typeof listRelatedBothWays>>,
): string {
  const q = question.toLowerCase();
  const heat = entity.metrics.heat ?? entity.metrics.views ?? null;
  const creators = related.filter((r) => r.entity.type === "creator").map((r) => r.entity.name);
  const sounds = related.filter((r) => r.entity.type === "sound").map((r) => r.entity.name);
  const topics = related.filter((r) => r.entity.type === "topic").map((r) => r.entity.name);

  if (q.includes("why") || q.includes("explod") || q.includes("viral")) {
    return [
      `“${entity.name}” is currently marked ${entity.status}`,
      heat != null ? `with heat/signal ~${heat}` : "with limited metric data so far",
      entity.firstSeenAt ? `First seen ${entity.firstSeenAt.slice(0, 10)}.` : "",
      topics.length ? `Tied to topics: ${topics.slice(0, 3).join(", ")}.` : "",
      sounds.length ? `Linked sounds/formats: ${sounds.slice(0, 2).join(", ")}.` : "",
      "Add OPENAI_API_KEY for a deeper analyst answer.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (q.includes("how") || q.includes("use") || q.includes("brand") || q.includes("compan")) {
    return `A remake angle for “${entity.name}”: hook with the same format${sounds[0] ? ` / sound (${sounds[0]})` : ""}, localize to your product in the first 2 seconds, and CTA to a concrete offer. Status is ${entity.status} — move while it's still ${entity.status === "declining" ? "known but not saturated for every niche" : "rising"}.`;
  }

  if (q.includes("creator") || q.includes("who") || q.includes("example")) {
    return creators.length
      ? `Creators linked so far: ${creators.slice(0, 5).map((c) => `@${c}`).join(", ")}.`
      : `No creator links stored for “${entity.name}” yet — they'll appear after daily ingest links posts.`;
  }

  return `“${entity.name}” (${entity.type}) · status ${entity.status}${heat != null ? ` · heat ${heat}` : ""}. Ask why it grew, how a brand could use it, or who is creating examples.`;
}
