import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createBrand } from "../actions";

export const metadata = { title: "Add brand — Signalbrief" };

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewBrandPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands/new");

  const { error } = await searchParams;

  return (
    <main className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-8 text-[var(--paper)] sm:px-8">
        <div className="mx-auto max-w-xl">
          <Link href="/brands" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
            ← Brands
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Add a brand
          </h1>
          <p className="mt-1 text-sm text-[var(--paper-muted)]">
            We&apos;ll generate monitoring keywords automatically — you can edit them after.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
        {error && (
          <p className="mb-4 border border-[var(--heat)] px-4 py-2 text-sm text-[var(--heat)]">
            {error === "name_required" ? "Brand name is required." : "Something went wrong — try again."}
          </p>
        )}

        <form action={createBrand} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
              Brand name *
            </label>
            <input id="name" name="name" required className="auth-input" placeholder="Acme Coffee" />
          </div>

          <div>
            <label htmlFor="website" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
              Website
            </label>
            <input id="website" name="website" className="auth-input" placeholder="acmecoffee.com" />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
              What does this brand do?
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="auth-input resize-y"
              placeholder="Cold brew coffee brand sold DTC and in grocery stores…"
            />
            <p className="mt-1 text-xs text-[var(--fog)]">
              Used to generate better monitoring keywords.
            </p>
          </div>

          <button type="submit" className="btn-primary">
            Create brand &amp; generate keywords
          </button>
        </form>
      </div>
    </main>
  );
}
