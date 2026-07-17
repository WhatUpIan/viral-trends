"use client";

import { createClient } from "@/lib/supabase/client";
import type { CategoryPref } from "@/lib/prefs";
import { useState } from "react";

type Props = {
  initial: CategoryPref[];
  userId: string;
};

export function CategoryPrefsEditor({ initial, userId }: Props) {
  const [prefs, setPrefs] = useState<CategoryPref[]>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= prefs.length) return;
    const next = [...prefs];
    [next[index], next[target]] = [next[target], next[index]];
    setPrefs(next.map((p, i) => ({ ...p, sortOrder: i })));
    setStatus(null);
  }

  function toggle(index: number) {
    const next = [...prefs];
    next[index] = { ...next[index], enabled: !next[index].enabled };
    setPrefs(next);
    setStatus(null);
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    const supabase = createClient();
    const rows = prefs.map((p, i) => ({
      user_id: userId,
      category: p.category,
      sort_order: i,
      enabled: p.enabled,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("user_category_prefs")
      .upsert(rows, { onConflict: "user_id,category" });
    setSaving(false);
    setStatus(error ? `Save failed: ${error.message}` : "Saved.");
  }

  return (
    <div>
      <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
        {prefs.map((pref, i) => (
          <li key={pref.category} className="flex items-center gap-3 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${pref.category} up`}
                className="text-xs text-[var(--fog)] hover:text-[var(--ink)] disabled:opacity-25"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === prefs.length - 1}
                aria-label={`Move ${pref.category} down`}
                className="text-xs text-[var(--fog)] hover:text-[var(--ink)] disabled:opacity-25"
              >
                ▼
              </button>
            </div>

            <span className="w-6 text-right text-xs tabular-nums text-[var(--fog)]">{i + 1}</span>

            <span
              className={`flex-1 text-sm ${pref.enabled ? "text-[var(--ink)]" : "text-[var(--fog)] line-through"}`}
            >
              {pref.category}
            </span>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--fog)]">
              <input
                type="checkbox"
                checked={pref.enabled}
                onChange={() => toggle(i)}
                className="h-4 w-4 accent-[var(--ink)]"
              />
              Show
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {status && <span className="text-sm text-[var(--fog)]">{status}</span>}
      </div>
    </div>
  );
}
