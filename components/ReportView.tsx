"use client";

import { useMemo, useState } from "react";
import { CategoryFilter } from "./CategoryFilter";
import { CategorySection } from "./CategorySection";
import { PlatformFilter } from "./PlatformFilter";
import type { Category, DailyReport, Platform } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

type Props = {
  report: DailyReport;
};

export function ReportView({ report }: Props) {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    return report.trends.filter((t) => {
      if (platform !== "all" && t.platform !== platform) return false;
      if (category !== "all" && t.category !== category) return false;
      return true;
    });
  }, [report.trends, platform, category]);

  const byCategory = useMemo(() => {
    const map = new Map<Category, typeof filtered>();
    for (const cat of CATEGORIES) {
      const items = filtered
        .filter((t) => t.category === cat)
        .sort((a, b) => b.heatScore - a.heatScore);
      if (items.length) map.set(cat, items);
    }
    return map;
  }, [filtered]);

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
