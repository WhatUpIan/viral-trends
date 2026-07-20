import { AppChrome } from "@/components/AppChrome";
import { CategoryPrefsEditor } from "@/components/CategoryPrefsEditor";
import { defaultPrefs, getUserCategoryPrefs } from "@/lib/prefs";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings — Signalbrief" };

export default async function CategorySettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/settings/categories");

  const prefs = (await getUserCategoryPrefs()) ?? defaultPrefs();

  return (
    <AppChrome pathname="/settings/categories">
      <div className="page-hero">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Category priorities
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">
            Reorder categories for Trends. Uncheck to hide one from your report.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <CategoryPrefsEditor initial={prefs} userId={user.id} />
      </div>
    </AppChrome>
  );
}
