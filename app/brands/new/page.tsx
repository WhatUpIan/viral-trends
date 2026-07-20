import { AppChrome } from "@/components/AppChrome";
import { BrandSetupForm } from "@/components/BrandSetupForm";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Add brand — Signalbrief" };

export default async function NewBrandPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands/new");

  return (
    <AppChrome pathname="/brands">
      <div className="page-hero">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
          <Link href="/brands" className="text-sm text-[var(--fog)] hover:text-[var(--ink)]">
            ← Brands
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Add a brand
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">
            Name + website — AI builds your profile, socials, and monitoring keywords.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <BrandSetupForm />
      </div>
    </AppChrome>
  );
}
