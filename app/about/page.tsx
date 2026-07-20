import { AppChrome } from "@/components/AppChrome";
import Link from "next/link";

export const metadata = { title: "About — Signalbrief" };

export default function AboutPage() {
  return (
    <AppChrome pathname="/about">
      <div className="page-hero">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            About
          </h1>
          <p className="mt-2 text-sm text-[var(--fog)]">
            US trends, memes, and brand listening for marketers and creators.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-2xl space-y-8 px-4 py-10 text-[var(--ink-soft)] sm:px-6">
        <p className="text-lg text-[var(--ink)]">
          Signalbrief surfaces remake-ready short-form signals and helps you listen to how people
          talk about your brand across social and the web.
        </p>

        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Four pillars
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <Link href="/" className="underline underline-offset-2">
                Trends
              </Link>{" "}
              — daily US remake-ready report
            </li>
            <li>
              <Link href="/memes" className="underline underline-offset-2">
                Memes
              </Link>{" "}
              — humor, formats, and challenges from the same report
            </li>
            <li>
              <Link href="/mentions" className="underline underline-offset-2">
                Mentions
              </Link>{" "}
              — social + web brand mentions
            </li>
            <li>
              <Link href="/feedback" className="underline underline-offset-2">
                Feedback
              </Link>{" "}
              — comments on those mentions
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Heat scoring
          </h2>
          <p className="text-sm leading-relaxed">
            Each trend gets a heat score from 0–100 based on engagement volume and recency. Newer
            posts with strong share velocity rank higher — early signal, not just absolute size.
          </p>
        </section>
      </article>
    </AppChrome>
  );
}
