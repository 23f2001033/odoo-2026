import { NextRequest, NextResponse } from "next/server";
import { authorize, errorResponse } from "@/lib/api";
import { csvResponse } from "@/lib/csv";
import { getMaintenanceFrequencyReport } from "@/modules/report/service";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    await authorize("report.orgWide");

    const periodDays = Number(req.nextUrl.searchParams.get("periodDays") ?? "30");
    const report = await getMaintenanceFrequencyReport(periodDays);

    if (req.nextUrl.searchParams.get("format") === "csv") {
      return csvResponse(
        "maintenance-frequency.csv",
        report.topAssets.map((a) => ({ assetTag: a.assetTag, name: a.name, requests: a.count }))
      );
    }
    return NextResponse.json({ data: report });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
