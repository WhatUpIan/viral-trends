import { AppChrome } from "@/components/AppChrome";
import { FeedbackList } from "@/components/FeedbackList";
import { getMentionComments, listBrands } from "@/lib/brands";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feedback — Signalbrief" };

export default async function FeedbackHubPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/feedback");

  const brands = await listBrands();
  const sections = await Promise.all(
    brands.map(async (brand) => ({
      brand,
      comments: await getMentionComments(brand.id),
    })),
  );

  return (
    <AppChrome pathname="/feedback">
      <div className="page-hero">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Feedback
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">
            Comments and audience reactions pulled from your brand mentions.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {brands.length === 0 ? (
          <div className="saas-panel px-6 py-14 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl">No brands yet</p>
            <Link href="/brands/new" className="btn-primary mt-6 inline-block">
              Add brand
            </Link>
          </div>
        ) : (
          sections.map(({ brand, comments }) => (
            <section key={brand.id}>
              <Link
                href={`/brands/${brand.id}?tab=feedback`}
                className="mb-3 inline-block font-[family-name:var(--font-display)] text-xl text-[var(--ink)] hover:underline"
              >
                {brand.name}
              </Link>
              <FeedbackList brandId={brand.id} comments={comments} />
            </section>
          ))
        )}
      </div>
    </AppChrome>
  );
}
