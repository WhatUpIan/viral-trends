import { getReportByDate, getTodayDateString } from "@/lib/reports";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = getTodayDateString();
  const report = await getReportByDate(today);

  if (!report) {
    return NextResponse.json(
      { error: "No report for today", date: today },
      { status: 404 },
    );
  }

  return NextResponse.json(report);
}
