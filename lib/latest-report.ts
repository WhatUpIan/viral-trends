import { MOCK_REPORT } from "@/lib/mock-data";
import { getReportByDate, getTodayDateString, listReports } from "@/lib/reports";
import type { DailyReport } from "@/lib/types";

/** Today's ready report, else most recent, else mock if enabled. */
export async function getLatestReport(): Promise<DailyReport | null> {
  const today = getTodayDateString();
  let report = await getReportByDate(today);

  if (!report || report.trends.length === 0) {
    const recent = await listReports();
    if (recent[0]) report = await getReportByDate(recent[0].reportDate);
  }

  if ((!report || report.trends.length === 0) && process.env.USE_MOCK_REPORT === "true") {
    return { ...MOCK_REPORT, reportDate: today };
  }

  return report && report.trends.length > 0 ? report : null;
}
