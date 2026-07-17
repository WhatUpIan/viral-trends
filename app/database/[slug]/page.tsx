import { AppShell } from "@/components/AppShell";
import { IntelligenceChat } from "@/components/IntelligenceChat";
import { getTrendIndustryStats } from "@/lib/adoption";
import {
  entityHref,
  getEntity,
  listRelatedBothWays,
} from "@/lib/entities";
import { getGreetingName } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entity = await getEntity("trend", slug);
  return { title: entity ? `${entity.name} — Trend Database` : "Trend — Signalbrief" };
}

export default async function TrendDetailPage({ params }: Props) {
  const user = await getUser();
  const { slug } = await params;
  if (!user) redirect(`/login?next=/database/${slug}`);

  const entity = await getEntity("trend", slug);
  if (!entity) notFound();

  const name = await getGreetingName();
  const related = await listRelatedBothWays(entity.id);
  const industryStats = await getTrendIndustryStats(entity.id);

  const creators = related.filter((r) => r.entity.type === "creator");
  const sounds = related.filter((r) => r.entity.type === "sound");
  const topics = related.filter((r) => r.entity.type === "topic");
  const brands = related.filter(
    (r) =>
      (r.entity.type === "brand" || r.entity.type === "company") &&
      (r.relation === "adopted_by" || r.relation === "mentions"),
  );
  const others = related.filter(
    (r) =>
      !["creator", "sound", "topic"].includes(r.entity.type) &&
      r.entity.type !== "brand" &&
      r.entity.type !== "company",
  );

  const url = typeof entity.attrs.url === "string" ? entity.attrs.url : null;
  const platform = typeof entity.attrs.platform === "string" ? entity.attrs.platform : null;
  const category = typeof entity.attrs.category === "string" ? entity.attrs.category : null;

  return (
    <AppShell pathname="/database" greetingName={name}>
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <Link href="/database" className="text-sm text-[var(--fog)] hover:text-[var(--ink)]">
          ← Trend Database
        </Link>

        <header className="mt-4 mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
            Trend entity
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
            {entity.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--fog)]">
            {[platform, category, entity.status].filter(Boolean).join(" · ")}
          </p>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="First seen" value={entity.firstSeenAt?.slice(0, 10) ?? "—"} />
          <Stat label="Peak" value={entity.peakAt?.slice(0, 10) ?? "—"} />
          <Stat label="Current" value={entity.status} />
          <Stat
            label="Heat"
            value={entity.metrics.heat != null ? String(entity.metrics.heat) : "—"}
          />
        </div>

        <section className="mb-8">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            Industries using this
          </h2>
          <p className="mb-3 text-xs text-[var(--fog)]">
            Brand adoption counts from the entity graph (0 = white space in our data).
          </p>
          <div className="flex flex-wrap gap-2">
            {industryStats
              .slice()
              .sort((a, b) => a.brandCount - b.brandCount)
              .map((s) => (
                <span key={s.industry} className="keyword-pill">
                  {s.industry}: {s.brandCount}
                </span>
              ))}
          </div>
        </section>

        {url && (
          <p className="mb-8 text-sm">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--ink)]"
            >
              Open source post
            </a>
          </p>
        )}

        <div className="mb-10 grid gap-8 lg:grid-cols-2">
          <RelatedBlock title="Creators" items={creators.map((r) => r.entity)} />
          <RelatedBlock title="Sounds / formats" items={sounds.map((r) => r.entity)} />
          <RelatedBlock title="Topics" items={topics.map((r) => r.entity)} />
          <RelatedBlock title="Brands / companies" items={brands.map((r) => r.entity)} />
          <RelatedBlock title="Other links" items={others.map((r) => r.entity)} />
        </div>

        <IntelligenceChat
          endpoint="/api/entities/chat"
          bodyExtras={{ type: "trend", slug: entity.slug }}
          title="AI conversation"
          placeholder="Why did this trend explode?"
          suggestions={[
            "Why did this trend explode?",
            "How could a plumbing company use this?",
            "Which industries have not adopted this yet?",
            "Is this still rising or declining?",
          ]}
        />
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fog)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}

function RelatedBlock({
  title,
  items,
}: {
  title: string;
  items: { type: string; slug: string; name: string }[];
}) {
  return (
    <div>
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--fog)]">None linked yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((e) => (
            <li key={`${e.type}-${e.slug}`}>
              <Link
                href={entityHref(e as { type: "creator"; slug: string })}
                className="underline hover:text-[var(--ink)]"
              >
                {e.name}
              </Link>
              <span className="text-[var(--fog)]"> · {e.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
