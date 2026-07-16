export type Platform =
  | "tiktok"
  | "youtube"
  | "instagram"
  | "x"
  | "reddit"
  | "meta";

export type Category =
  | "Sounds & Audio"
  | "Formats & Challenges"
  | "Memes & Humor"
  | "Products & Brands"
  | "News & Culture"
  | "Beauty & Fashion"
  | "Fitness & Wellness"
  | "Food & Drink"
  | "Tech & Gaming"
  | "Other";

export const CATEGORIES: Category[] = [
  "Sounds & Audio",
  "Formats & Challenges",
  "Memes & Humor",
  "Products & Brands",
  "News & Culture",
  "Beauty & Fashion",
  "Fitness & Wellness",
  "Food & Drink",
  "Tech & Gaming",
  "Other",
];

export const PLATFORMS: Platform[] = [
  "tiktok",
  "youtube",
  "instagram",
  "x",
  "reddit",
  "meta",
];

export type TrendMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

export type TrendItem = {
  platform: Platform;
  externalId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  creatorHandle?: string;
  metrics: TrendMetrics;
  publishedAt?: string;
  soundOrFormat?: string;
  /** Category the sourcing query targeted; classifier uses it as a strong prior. */
  categoryHint?: Category;
  raw: unknown;
};

export type ScoredTrend = TrendItem & {
  heatScore: number;
};

export type ClassifiedTrend = ScoredTrend & {
  category: Category;
  insight: string;
};

export type ReportStatus = "pending" | "ready" | "failed";

export type DailyReport = {
  id: string;
  reportDate: string;
  status: ReportStatus;
  summary: string | null;
  createdAt: string;
  trends: ReportTrend[];
};

export type ReportTrend = {
  id: string;
  platform: Platform;
  externalId: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  creatorHandle: string | null;
  metrics: TrendMetrics;
  heatScore: number;
  category: Category;
  insight: string | null;
  soundOrFormat: string | null;
};
