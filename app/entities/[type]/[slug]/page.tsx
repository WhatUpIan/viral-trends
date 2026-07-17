import { AppShell } from "@/components/AppShell";
import { IntelligenceChat } from "@/components/IntelligenceChat";
import {
  entityHref,
  getEntity,
  listRelatedBothWays,
  type EntityType,
} from "@/lib/entities";
import { getGreetingName } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const VALID_TYPES: EntityType[] = [
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

type Props = { params: Promise<{ type: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { type, slug } = await params;
  if (!VALID_TYPES.includes(type as EntityType)) return { title: "Entity — Signalbrief" };
  const entity = await getEntity(type as EntityType, slug);
  return { title: entity ? `${entity.name} — Signalbrief` : "Entity — Signalbrief" };
}

export default async function EntityProfilePage({ params }: Props) {
  const user = await getUser();
  const { type, slug } = await params;
  if (!user) redirect(`/login?next=/entities/${type}/${slug}`);

  if (!VALID_TYPES.includes(type as EntityType)) notFound();

  // Trends have a richer dedicated page
  if (type === "trend") {
    redirect(`/database/${slug}`);
  }

  const entity = await getEntity(type as EntityType, slug);
  if (!entity) notFound();

  const name = await getGreetingName();
  const related = await listRelatedBothWays(entity.id);

  return (
    <AppShell pathname="/database" greetingName={name}>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <Link href="/search" className="text-sm text-[var(--fog)] hover:text-[var(--ink)]">
          ← Search
        </Link>

        <header className="mt-4 mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
            {entity.type} entity
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
            {entity.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--fog)]">
            Status {entity.status}
            {entity.firstSeenAt ? ` · first ${entity.firstSeenAt.slice(0, 10)}` : ""}
          </p>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(entity.metrics).map(([k, v]) => (
            <div key={k} className="border border-[var(--line)] bg-white px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--fog)]">{k}</p>
              <p className="font-[family-name:var(--font-display)] text-lg">{v}</p>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Connected entities
          </h2>
          {related.length === 0 ? (
            <p className="text-sm text-[var(--fog)]">No graph links yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
              {related.map((r) => (
                <li key={`${r.direction}-${r.relation}-${r.entity.id}`}>
                  <Link
                    href={entityHref(r.entity)}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--paper)]"
                  >
                    <span>
                      <span className="font-medium">{r.entity.name}</span>
                      <span className="text-[var(--fog)]">
                        {" "}
                        · {r.entity.type} · {r.relation} ({r.direction})
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <IntelligenceChat
          endpoint="/api/entities/chat"
          bodyExtras={{ type: entity.type, slug: entity.slug }}
          title="Ask about this entity"
          placeholder={`Tell me about ${entity.name}…`}
          suggestions={[
            `Why does ${entity.name} matter right now?`,
            "What is linked to this?",
            "How should a brand engage?",
          ]}
        />
      </div>
    </AppShell>
  );
}
