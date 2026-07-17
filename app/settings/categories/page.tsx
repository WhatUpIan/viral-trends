import { CategoryPrefsEditor } from "@/components/CategoryPrefsEditor";
import { defaultPrefs, getUserCategoryPrefs } from "@/lib/prefs";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Category preferences — Signalbrief" };

export default async function CategorySettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/settings/categories");

  const prefs = (await getUserCategoryPrefs()) ?? defaultPrefs();

  return (
    <main className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] px-5 py-8 text-[var(--paper)] sm:px-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm text-[var(--paper-muted)] hover:text-[var(--paper)]">
            ← Signalbrief
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Category priorities
          </h1>
          <p className="mt-1 text-sm text-[var(--paper-muted)]">
            Reorder categories to control how your daily report is laid out. Uncheck to hide one.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <CategoryPrefsEditor initial={prefs} userId={user.id} />
      </div>
    </main>
  );
}
