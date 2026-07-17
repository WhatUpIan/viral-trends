import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandSetupForm } from "@/components/BrandSetupForm";

export const metadata = { title: "Add brand — Signalbrief" };

export default async function NewBrandPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands/new");

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
            Enter your brand name and website — AI will compile your profile, social handles, and 20 monitoring keywords.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
        <BrandSetupForm />
      </div>
    </main>
  );
}
