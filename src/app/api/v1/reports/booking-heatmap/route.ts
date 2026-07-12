import { NextRequest, NextResponse } from "next/server";
import { authorize, errorResponse } from "@/lib/api";
import { csvResponse } from "@/lib/csv";
import { getBookingHeatmap } from "@/modules/report/service";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    await authorize("report.orgWide");

    const periodDays = Number(req.nextUrl.searchParams.get("periodDays") ?? "30");
    const report = await getBookingHeatmap(periodDays);

    if (req.nextUrl.searchParams.get("format") === "csv") {
      const rows: Record<string, unknown>[] = [];
      report.grid.forEach((hours, day) => {
        hours.forEach((count, hour) => {
          rows.push({ day: DAY_LABELS[day], hour, bookings: count });
        });
      });
      return csvResponse("booking-heatmap.csv", rows);
    }
    return NextResponse.json({ data: report });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
