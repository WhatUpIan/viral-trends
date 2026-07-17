import {
  getBrand,
  getBrandKeywords,
  getBrandMentions,
  getBrandSocialAccounts,
  getMentionComments,
} from "@/lib/brands";
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
} from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; source?: string }>;
};

const TABS = [
  { id: "mentions", label: "Mentions" },
  { id: "keywords", label: "Keywords" },
  { id: "accounts", label: "Accounts" },
  { id: "feedback", label: "Feedback" },
] as const;

export default async function BrandDetailPage({ params, searchParams }: Props) {
  const user = await getUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/brands/${id}`);

  const brand = await getBrand(id);
  if (!brand) notFound();

  const { tab: rawTab, source } = await searchParams;
  const tab = TABS.some((t) => t.id === rawTab) ? rawTab : "mentions";

  const keywords = await getBrandKeywords(id);
  const socialAccounts = await getBrandSocialAccounts(id);
  const generated = keywords.filter((k) => k.kind === "generated");
  const custom = keywords.filter((k) => k.kind === "custom");
  const negative = keywords.filter((k) => k.kind === "negative");

  return (
    <main className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-8 text-[var(--paper)] sm:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/brands" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
            ← Brands
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
                {brand.name}
              </h1>
              <p className="mt-1 text-sm text-[var(--paper-muted)]">
                {brand.website ?? "No website"} ·{" "}
                {brand.status === "active" ? "Monitoring active" : "Monitoring paused"}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <RunMonitoringButton brandId={brand.id} label="Run monitoring" />
              <form action={toggleBrandStatus.bind(null, brand.id, brand.status)}>
                <button
                  type="submit"
                  className="border border-[var(--paper-muted)] px-3 py-1.5 text-xs text-[var(--paper)] transition hover:border-[var(--paper)]"
                >
                  {brand.status === "active" ? "Pause" : "Resume"}
                </button>
              </form>
              <form action={deleteBrand.bind(null, brand.id)}>
                <button
                  type="submit"
                  className="border border-[var(--heat)] px-3 py-1.5 text-xs text-[var(--heat)] transition hover:bg-[var(--heat)] hover:text-white"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>

          <nav className="mt-6 flex gap-1">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={`/brands/${brand.id}?tab=${t.id}`}
                className={`px-4 py-2 text-sm transition ${
                  tab === t.id
                    ? "bg-[var(--paper)] font-semibold text-[var(--ink)]"
                    : "text-[var(--paper-muted)] hover:text-[var(--paper)]"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        {tab === "mentions" && (
          <MentionsList
            mentions={await getBrandMentions(id)}
            brandId={brand.id}
            sourceFilter={source === "social" || source === "web" ? source : null}
          />
        )}

        {tab === "keywords" && (
          <div className="space-y-10">
            <section>
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
              <p className="mb-4 text-sm text-[var(--fog)]">
                Auto-generated from your brand profile. These are searched along with your custom
                keywords.
              </p>
              <KeywordPills brandId={brand.id} keywords={generated} />
            </section>

            <section>
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Custom keywords
              </h2>
              <p className="mb-4 text-sm text-[var(--fog)]">
                Product names, campaign hashtags, founder names — anything else worth tracking.
              </p>
              <KeywordPills brandId={brand.id} keywords={custom} />
              <AddKeywordForm brandId={brand.id} kind="custom" placeholder="e.g. #acmesummer" />
            </section>

            <section>
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Negative keywords
              </h2>
              <p className="mb-4 text-sm text-[var(--fog)]">
                Mentions containing these are excluded — use for unrelated meanings of your name.
              </p>
              <KeywordPills brandId={brand.id} keywords={negative} negative />
              <AddKeywordForm brandId={brand.id} kind="negative" placeholder="e.g. acme looney tunes" />
            </section>
          </div>
        )}

        {tab === "feedback" && <FeedbackList comments={await getMentionComments(id)} />}

        {tab === "accounts" && (
          <div>
            <p className="mb-4 text-sm text-[var(--fog)]">
              Add your official handles on each platform. Monitoring will skip your own posts and
              pages on your website.
            </p>
            <form action={saveSocialAccounts.bind(null, brand.id)} className="space-y-4">
              <BrandSocialFields accounts={socialAccounts} />
              <button type="submit" className="btn-primary">
                Save accounts
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
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
