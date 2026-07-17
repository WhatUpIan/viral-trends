import { AppShell } from "@/components/AppShell";
import { BrandSetupForm } from "@/components/BrandSetupForm";
import { getGreetingName } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Add brand — Signalbrief" };

export default async function NewBrandPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brands/new");
  const name = await getGreetingName();

  return (
    <AppShell pathname="/brands" greetingName={name}>
      <div className="border-b border-[var(--line)] px-5 py-8 sm:px-8">
        <Link href="/brands" className="text-sm text-[var(--fog)] hover:text-[var(--ink)]">
          ← Brands
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Add a brand
        </h1>
        <p className="mt-1 text-sm text-[var(--fog)]">
          Enter name + website — AI compiles profile, socials, keywords, and brand intelligence.
        </p>
      </div>
      <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
        <BrandSetupForm />
      </div>
    </AppShell>
  );
}
