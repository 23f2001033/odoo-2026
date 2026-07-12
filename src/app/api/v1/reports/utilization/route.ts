import { NextRequest, NextResponse } from "next/server";
import { authorize, errorResponse } from "@/lib/api";
import { csvResponse } from "@/lib/csv";
import { getUtilizationReport } from "@/modules/report/service";

// Reports bypass apiHandler (which always wraps in NextResponse.json) since
// ?format=csv needs a different response type.
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    await authorize("report.orgWide");

    const periodDays = Number(req.nextUrl.searchParams.get("periodDays") ?? "30");
    const report = await getUtilizationReport(periodDays);

    if (req.nextUrl.searchParams.get("format") === "csv") {
      return csvResponse(
        "utilization.csv",
        report.mostUsed.map((a) => ({ assetTag: a.assetTag, name: a.name, hours: a.hours }))
      );
    }
    return NextResponse.json({ data: report });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
