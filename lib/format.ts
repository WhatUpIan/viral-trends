import type { Platform } from "./types";

export function formatNumber(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function platformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    tiktok: "TikTok",
    youtube: "YouTube",
    instagram: "Instagram",
    x: "X",
    reddit: "Reddit",
    meta: "Meta Reels",
  };
  return labels[platform];
}

export function formatReportDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
