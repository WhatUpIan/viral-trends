"use client";

import { platformLabel } from "@/lib/format";
import type { Platform } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";

type Props = {
  selected: Platform | "all";
  onChange: (platform: Platform | "all") => void;
};

export function PlatformFilter({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by platform">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`filter-chip ${selected === "all" ? "filter-chip-active" : ""}`}
      >
        All platforms
      </button>
      {PLATFORMS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`filter-chip ${selected === p ? "filter-chip-active" : ""}`}
        >
          {platformLabel(p)}
        </button>
      ))}
    </div>
  );
}
