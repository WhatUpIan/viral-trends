"use client";

import { useMemo, useState } from "react";
import { CategoryFilter } from "./CategoryFilter";
import { CategorySection } from "./CategorySection";
import { PlatformFilter } from "./PlatformFilter";
import type { Category, DailyReport, Platform } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

type CategoryPrefInput = {
  category: Category;
  sortOrder: number;
  enabled: boolean;
};

type Props = {
  report: DailyReport;
  categoryPrefs?: CategoryPrefInput[] | null;
};

export function ReportView({ report, categoryPrefs }: Props) {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");

  const orderedCategories = useMemo<Category[]>(() => {
    if (!categoryPrefs || categoryPrefs.length === 0) return [...CATEGORIES];
    return [...categoryPrefs]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((p) => p.enabled)
      .map((p) => p.category);
  }, [categoryPrefs]);

  const filtered = useMemo(() => {
    const visible = new Set(orderedCategories);
    return report.trends.filter((t) => {
      if (!visible.has(t.category)) return false;
      if (platform !== "all" && t.platform !== platform) return false;
      if (category !== "all" && t.category !== category) return false;
      return true;
    });
  }, [report.trends, platform, category, orderedCategories]);

  const byCategory = useMemo(() => {
    const map = new Map<Category, typeof filtered>();
    for (const cat of orderedCategories) {
      const items = filtered
        .filter((t) => t.category === cat)
        .sort((a, b) => b.heatScore - a.heatScore);
      if (items.length) map.set(cat, items);
    }
    return map;
  }, [filtered, orderedCategories]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-8 space-y-3">
        <PlatformFilter selected={platform} onChange={setPlatform} />
        <CategoryFilter selected={category} onChange={setCategory} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[var(--fog)]">
          No trends match these filters.
        </p>
      ) : category !== "all" ? (
        <CategorySection title={category} trends={filtered} />
      ) : (
        Array.from(byCategory.entries()).map(([cat, trends]) => (
          <CategorySection key={cat} title={cat} trends={trends} />
        ))
      )}
    </div>
  );
}
