import { AppShell } from "@/components/AppShell";
import { CategoryPrefsEditor } from "@/components/CategoryPrefsEditor";
import { getGreetingName } from "@/lib/greeting";
import { defaultPrefs, getUserCategoryPrefs } from "@/lib/prefs";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings — Signalbrief" };

export default async function CategorySettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/settings/categories");

  const prefs = (await getUserCategoryPrefs()) ?? defaultPrefs();
  const name = await getGreetingName();

  return (
    <AppShell pathname="/settings/categories" greetingName={name}>
      <div className="border-b border-[var(--line)] px-5 py-8 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Category priorities
        </h1>
        <p className="mt-1 text-sm text-[var(--fog)]">
          Reorder categories for the Trends module. Uncheck to hide one from your report.
        </p>
      </div>
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <CategoryPrefsEditor initial={prefs} userId={user.id} />
      </div>
    </AppShell>
  );
}
