import { createClient, getUser } from "@/lib/supabase/server";
import { CATEGORIES, type Category } from "@/lib/types";

export type CategoryPref = {
  category: Category;
  sortOrder: number;
  enabled: boolean;
};

export function defaultPrefs(): CategoryPref[] {
  return CATEGORIES.map((category, i) => ({
    category,
    sortOrder: i,
    enabled: true,
  }));
}

/** Load the signed-in user's category prefs, merged over defaults. Null when logged out. */
export async function getUserCategoryPrefs(): Promise<CategoryPref[] | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_category_prefs")
    .select("category, sort_order, enabled")
    .eq("user_id", user.id);

  if (error || !data || data.length === 0) return defaultPrefs();

  const saved = new Map(
    data.map((row) => [
      row.category as Category,
      { sortOrder: row.sort_order as number, enabled: row.enabled as boolean },
    ]),
  );

  return CATEGORIES.map((category, i) => {
    const row = saved.get(category);
    return {
      category,
      sortOrder: row?.sortOrder ?? CATEGORIES.length + i,
      enabled: row?.enabled ?? true,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}
