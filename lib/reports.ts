import { MOCK_REPORT } from "./mock-data";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type {
  Category,
  DailyReport,
  Platform,
  ReportStatus,
  ReportTrend,
  TrendMetrics,
} from "./types";

type ReportRow = {
  id: string;
  report_date: string;
  status: ReportStatus;
  summary: string | null;
  created_at: string;
};

type TrendRow = {
  id: string;
  platform: Platform;
  external_id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  creator_handle: string | null;
  metrics: TrendMetrics;
  heat_score: number;
  category: Category;
  insight: string | null;
  sound_or_format: string | null;
};

function mapTrend(row: TrendRow): ReportTrend {
  return {
    id: row.id,
    platform: row.platform,
    externalId: row.external_id,
    title: row.title,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    creatorHandle: row.creator_handle,
    metrics: row.metrics ?? {},
    heatScore: row.heat_score,
    category: row.category,
    insight: row.insight,
    soundOrFormat: row.sound_or_format,
  };
}

export function getTodayDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function getReportByDate(date: string): Promise<DailyReport | null> {
  if (!isSupabaseConfigured()) {
    if (process.env.USE_MOCK_REPORT === "true") return MOCK_REPORT;
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: report, error } = await supabase
    .from("reports")
    .select("id, report_date, status, summary, created_at")
    .eq("report_date", date)
    .eq("status", "ready")
    .maybeSingle();

  if (error || !report) return null;

  const { data: trends, error: trendsError } = await supabase
    .from("trends")
    .select(
      "id, platform, external_id, title, url, thumbnail_url, creator_handle, metrics, heat_score, category, insight, sound_or_format",
    )
    .eq("report_id", report.id)
    .order("heat_score", { ascending: false });

  if (trendsError) return null;

  const row = report as ReportRow;
  return {
    id: row.id,
    reportDate: row.report_date,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
    trends: ((trends ?? []) as TrendRow[]).map(mapTrend),
  };
}

export async function listReports(): Promise<
  { id: string; reportDate: string; status: ReportStatus }[]
> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reports")
    .select("id, report_date, status")
    .eq("status", "ready")
    .order("report_date", { ascending: false })
    .limit(60);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id as string,
    reportDate: r.report_date as string,
    status: r.status as ReportStatus,
  }));
}

export type PersistTrendInput = {
  platform: Platform;
  externalId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  creatorHandle?: string;
  metrics: TrendMetrics;
  heatScore: number;
  category: Category;
  insight: string;
  soundOrFormat?: string;
  raw?: unknown;
};

function sanitizeMetrics(metrics: TrendMetrics): TrendMetrics {
  const out: TrendMetrics = {};
  for (const key of ["views", "likes", "comments", "shares"] as const) {
    const n = metrics[key];
    if (typeof n === "number" && Number.isFinite(n)) out[key] = n;
  }
  return out;
}

export async function persistDailyReport(opts: {
  reportDate: string;
  summary: string;
  trends: PersistTrendInput[];
}): Promise<{ reportId: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("report_date", opts.reportDate)
    .maybeSingle();

  let reportId: string;

  if (existing?.id) {
    reportId = existing.id as string;
  } else {
    const { data: inserted, error } = await supabase
      .from("reports")
      .insert({
        report_date: opts.reportDate,
        status: "pending",
        summary: opts.summary,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Failed to create report");
    }
    reportId = inserted.id as string;
  }

  const clean = (value: string) => value.replace(/\u0000/g, "").trim();

  const rows = opts.trends.map((t) => ({
    report_id: reportId,
    platform: t.platform,
    external_id: clean(String(t.externalId)).slice(0, 500),
    title: clean(String(t.title || "Untitled")).slice(0, 500),
    url: clean(String(t.url)).slice(0, 2000),
    thumbnail_url: t.thumbnailUrl ? clean(String(t.thumbnailUrl)).slice(0, 2000) : null,
    creator_handle: t.creatorHandle ? clean(String(t.creatorHandle)).slice(0, 200) : null,
    heat_score: Math.max(0, Math.min(100, Math.round(Number(t.heatScore)) || 0)),
    category: t.category,
    insight: t.insight ? clean(String(t.insight)).slice(0, 1000) : null,
    sound_or_format: t.soundOrFormat ? clean(String(t.soundOrFormat)).slice(0, 300) : null,
  }));

  // Wipe-and-replace only after a probe insert succeeds, so we never blank the UI on failure.
  const probe = rows[0];
  if (probe) {
    const probeRow = { ...probe, metrics: {} };
    const { error: probeError } = await supabase.from("trends").insert(probeRow);
    if (probeError && !probeError.message.includes("duplicate")) {
      throw new Error(
        JSON.stringify({
          message: probeError.message,
          details: probeError.details,
          hint: probeError.hint,
          code: probeError.code,
        }),
      );
    }
    // Clear prior rows for a clean replace (probe row may already exist).
    await supabase.from("trends").delete().eq("report_id", reportId);

    const batchSize = 5;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((r) => ({ ...r, metrics: {} }));
      const { error: insertError } = await supabase.from("trends").insert(batch);
      if (insertError) {
        throw new Error(
          JSON.stringify({
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
            batchStart: i,
          }),
        );
      }
    }

    // Best-effort metrics attach (ignore failures — empty {} still renders).
    for (const t of opts.trends) {
      const metrics = sanitizeMetrics(t.metrics);
      await supabase
        .from("trends")
        .update({ metrics })
        .eq("report_id", reportId)
        .eq("platform", t.platform)
        .eq("external_id", String(t.externalId).slice(0, 500));
    }
  } else {
    await supabase.from("trends").delete().eq("report_id", reportId);
  }

  const { error: reportError } = await supabase
    .from("reports")
    .update({ status: "ready", summary: opts.summary })
    .eq("id", reportId);

  if (reportError) {
    throw new Error(reportError.message);
  }

  return { reportId };
}

export async function markReportFailed(reportDate: string, summary: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("report_date", reportDate)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("reports")
      .update({ status: "failed", summary })
      .eq("id", existing.id);
  } else {
    await supabase.from("reports").insert({
      report_date: reportDate,
      status: "failed",
      summary,
    });
  }
}
