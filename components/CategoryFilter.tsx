"use client";

import type { Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

type Props = {
  selected: Category | "all";
  onChange: (category: Category | "all") => void;
};

export function CategoryFilter({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`filter-chip ${selected === "all" ? "filter-chip-active" : ""}`}
      >
        All categories
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`filter-chip ${selected === c ? "filter-chip-active" : ""}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
