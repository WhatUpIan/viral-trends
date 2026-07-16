import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-10 text-[var(--paper)] sm:px-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
            ← Signalbrief
          </Link>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            About
          </h1>
        </div>
      </div>

      <article className="mx-auto max-w-2xl px-5 py-12 leading-relaxed text-[var(--ink-soft)] sm:px-8">
        <p className="mb-6 text-lg text-[var(--ink)]">
          Signalbrief is a daily viral report for marketers and content creators. We surface what is
          rising across TikTok, YouTube Shorts, Instagram & Meta Reels, X, and Reddit — categorized
          and scored so you can act before saturation.
        </p>

        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          How heat scoring works
        </h2>
        <p className="mb-4">
          Each item gets a heat score from 0–100 based on engagement volume (views, likes, comments,
          shares) and recency. Newer posts with strong share velocity rank higher — the goal is early
          signal, not just absolute size.
        </p>

        <h2 className="mb-3 mt-10 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Categories
        </h2>
        <p className="mb-4">
          Trends are classified into creator- and marketer-friendly buckets: Sounds & Audio, Formats
          & Challenges, Memes & Humor, Products & Brands, News & Culture, Beauty & Fashion, Fitness
          & Wellness, Food & Drink, Tech & Gaming, and Other.
        </p>

        <h2 className="mb-3 mt-10 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Data
        </h2>
        <p>
          Platform data is pulled daily via CreatorCrawl. Meta short-form is covered through
          Instagram Reels discovery. Reports refresh once per day via a protected cron job.
        </p>
      </article>
    </main>
  );
}
