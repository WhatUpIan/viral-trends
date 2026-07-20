import {
  getBrand,
  getBrandKeywords,
  getBrandMentions,
  getBrandSocialAccounts,
  getMentionComments,
  type BrandMention,
} from "@/lib/brands";
import { AppChrome } from "@/components/AppChrome";
import { BrandSocialFields } from "@/components/BrandSocialFields";
import { FeedbackList } from "@/components/FeedbackList";
import { MentionsList } from "@/components/MentionsList";
import { RunMonitoringButton } from "@/components/RunMonitoringButton";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addKeyword,
  deleteBrand,
  deleteKeyword,
  regenerateKeywords,
  saveSocialAccounts,
  toggleBrandStatus,
  updateBrand,
} from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; platform?: string; flag?: string }>;
};

const PLATFORM_NAV = [
  { id: null, label: "All platforms" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "reddit", label: "Reddit" },
  { id: "x", label: "X" },
  { id: "web", label: "Web" },
  { id: "news", label: "News" },
] as const;

function countByPlatform(mentions: BrandMention[]) {
  const counts = new Map<string, number>();
  for (const m of mentions) {
    const key = m.platform ?? m.source;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export default async function BrandDetailPage({ params, searchParams }: Props) {
  const user = await getUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/brands/${id}`);

  const brand = await getBrand(id);
  if (!brand) notFound();

  const { tab: rawTab, platform, flag } = await searchParams;
  const tab =
    rawTab === "feedback" || rawTab === "profile" || rawTab === "mentions"
      ? rawTab
      : "mentions";

  const mentions = await getBrandMentions(id);
  const platformCounts = countByPlatform(mentions);
  const platformFilter =
    PLATFORM_NAV.some((p) => p.id === platform) && platform ? platform : null;

  const comments = tab === "feedback" ? await getMentionComments(id) : [];
  const keywords = tab === "profile" ? await getBrandKeywords(id) : [];
  const socialAccounts = tab === "profile" ? await getBrandSocialAccounts(id) : [];

  return (
    <AppChrome pathname="/brands" activeBrandId={brand.id}>
      <div className="page-hero">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-8 sm:px-6">
          <div className="min-w-0">
            <Link href="/brands" className="text-sm text-[var(--fog)] hover:text-[var(--ink)]">
              ← Brands
            </Link>
            <h1 className="mt-2 truncate font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
              {brand.name}
            </h1>
            <p className="mt-1 truncate text-sm text-[var(--fog)]">
              {brand.website ?? "No website"} ·{" "}
              {brand.status === "active" ? "Monitoring active" : "Paused"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <RunMonitoringButton brandId={brand.id} label="Run monitoring" />
            <form action={toggleBrandStatus.bind(null, brand.id, brand.status)}>
              <button type="submit" className="btn-secondary text-xs">
                {brand.status === "active" ? "Pause" : "Resume"}
              </button>
            </form>
            <form action={deleteBrand.bind(null, brand.id)}>
              <button
                type="submit"
                className="rounded-md border border-[var(--heat)] px-3 py-1.5 text-xs text-[var(--heat)] transition hover:bg-[var(--heat)] hover:text-white"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-0 px-4 sm:px-6 lg:flex-row">
        <aside className="border-b border-[var(--line)] lg:w-52 lg:shrink-0 lg:border-b-0 lg:border-r lg:pr-4">
          <nav className="sticky top-14 flex gap-1 overflow-x-auto py-4 lg:flex-col lg:overflow-visible lg:py-8">
            <p className="mb-1 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fog)] lg:block">
              Mentions
            </p>
            {PLATFORM_NAV.map((p) => {
              const href = p.id
                ? `/brands/${brand.id}?tab=mentions&platform=${p.id}`
                : `/brands/${brand.id}?tab=mentions`;
              const active = tab === "mentions" && platformFilter === p.id;
              const count = p.id ? (platformCounts.get(p.id) ?? 0) : mentions.length;
              return (
                <Link
                  key={p.label}
                  href={href}
                  className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-[var(--ink)] font-medium text-white"
                      : "text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)]"
                  }`}
                >
                  <span>{p.label}</span>
                  <span
                    className={`tabular-nums text-[11px] ${
                      active ? "text-white/70" : "text-[var(--fog)]"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}

            <div className="my-2 hidden h-px bg-[var(--line)] lg:block" />

            <Link
              href={`/brands/${brand.id}?tab=feedback`}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                tab === "feedback"
                  ? "bg-[var(--ink)] font-medium text-white"
                  : "text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)]"
              }`}
            >
              Feedback
            </Link>
            <Link
              href={`/brands/${brand.id}?tab=profile`}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                tab === "profile"
                  ? "bg-[var(--ink)] font-medium text-white"
                  : "text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)]"
              }`}
            >
              Profile
            </Link>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 py-8 lg:pl-8">
          {tab === "mentions" && (
            <MentionsList
              mentions={mentions}
              brandId={brand.id}
              platformFilter={platformFilter}
              flagFilter={flag === "highlighted" || flag === "unviewed" ? flag : null}
            />
          )}

          {tab === "feedback" && <FeedbackList brandId={brand.id} comments={comments} />}

          {tab === "profile" && (
            <ProfileTab brand={brand} keywords={keywords} socialAccounts={socialAccounts} />
          )}
        </div>
      </div>
    </AppChrome>
  );
}

async function ProfileTab({
  brand,
  keywords,
  socialAccounts,
}: {
  brand: NonNullable<Awaited<ReturnType<typeof getBrand>>>;
  keywords: Awaited<ReturnType<typeof getBrandKeywords>>;
  socialAccounts: Awaited<ReturnType<typeof getBrandSocialAccounts>>;
}) {
  const generated = keywords.filter((k) => k.kind === "generated");
  const custom = keywords.filter((k) => k.kind === "custom");
  const negative = keywords.filter((k) => k.kind === "negative");

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <section className="saas-panel p-6">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Brand details
        </h2>
        <form action={updateBrand.bind(null, brand.id)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]"
            >
              Brand name *
            </label>
            <input id="name" name="name" required defaultValue={brand.name} className="auth-input" />
          </div>
          <div>
            <label
              htmlFor="website"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]"
            >
              Website
            </label>
            <input
              id="website"
              name="website"
              defaultValue={brand.website ?? ""}
              className="auth-input"
              placeholder="acmecoffee.com"
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={brand.description ?? ""}
              className="auth-input resize-y"
            />
          </div>
          <button type="submit" className="btn-primary">
            Save details
          </button>
        </form>
      </section>

      {Object.keys(brand.metadata).length > 0 && (
        <section className="saas-panel p-6">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Research profile
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {brand.metadata.industry && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Industry</dt>
                <dd>{brand.metadata.industry}</dd>
              </div>
            )}
            {brand.metadata.tagline && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Tagline</dt>
                <dd>{brand.metadata.tagline}</dd>
              </div>
            )}
            {brand.metadata.targetAudience && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Audience</dt>
                <dd>{brand.metadata.targetAudience}</dd>
              </div>
            )}
            {brand.metadata.headquarters && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Headquarters</dt>
                <dd>{brand.metadata.headquarters}</dd>
              </div>
            )}
            {(brand.metadata.products?.length ?? 0) > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Products</dt>
                <dd>{brand.metadata.products?.join(" · ")}</dd>
              </div>
            )}
            {(brand.metadata.competitors?.length ?? 0) > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Competitors</dt>
                <dd>{brand.metadata.competitors?.join(" · ")}</dd>
              </div>
            )}
            {brand.metadata.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Notes</dt>
                <dd>{brand.metadata.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="saas-panel p-6">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Social accounts
        </h2>
        <p className="mb-4 text-sm text-[var(--fog)]">
          Official handles — monitoring skips your own posts and website pages.
        </p>
        <form action={saveSocialAccounts.bind(null, brand.id)} className="space-y-4">
          <BrandSocialFields accounts={socialAccounts} />
          <button type="submit" className="btn-primary">
            Save accounts
          </button>
        </form>
      </section>

      <section className="saas-panel p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Generated keywords
          </h2>
          <form action={regenerateKeywords.bind(null, brand.id)}>
            <button type="submit" className="btn-secondary text-xs">
              Regenerate
            </button>
          </form>
        </div>
        <KeywordPills brandId={brand.id} keywords={generated} />
      </section>

      <section className="saas-panel p-6">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Custom keywords
        </h2>
        <KeywordPills brandId={brand.id} keywords={custom} />
        <AddKeywordForm brandId={brand.id} kind="custom" placeholder="e.g. #acmesummer" />
      </section>

      <section className="saas-panel p-6">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Negative keywords
        </h2>
        <KeywordPills brandId={brand.id} keywords={negative} negative />
        <AddKeywordForm brandId={brand.id} kind="negative" placeholder="e.g. acme looney tunes" />
      </section>
    </div>
  );
}

function KeywordPills({
  brandId,
  keywords,
  negative = false,
}: {
  brandId: string;
  keywords: { id: string; keyword: string }[];
  negative?: boolean;
}) {
  if (keywords.length === 0) {
    return <p className="mb-3 text-sm text-[var(--fog)]">None yet.</p>;
  }
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {keywords.map((k) => (
        <span key={k.id} className={`keyword-pill ${negative ? "keyword-pill-negative" : ""}`}>
          {k.keyword}
          <form action={deleteKeyword.bind(null, brandId, k.id)} className="inline">
            <button
              type="submit"
              aria-label={`Remove ${k.keyword}`}
              className="cursor-pointer text-[var(--fog)] hover:text-[var(--heat)]"
            >
              ×
            </button>
          </form>
        </span>
      ))}
    </div>
  );
}

function AddKeywordForm({
  brandId,
  kind,
  placeholder,
}: {
  brandId: string;
  kind: "custom" | "negative";
  placeholder: string;
}) {
  return (
    <form action={addKeyword.bind(null, brandId)} className="flex max-w-md gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input name="keyword" required className="auth-input flex-1" placeholder={placeholder} />
      <button type="submit" className="btn-secondary shrink-0">
        Add
      </button>
    </form>
  );
}
