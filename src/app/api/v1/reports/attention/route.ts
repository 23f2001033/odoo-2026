import { NextRequest, NextResponse } from "next/server";
import { authorize, errorResponse } from "@/lib/api";
import { csvResponse } from "@/lib/csv";
import { getAttentionReport } from "@/modules/report/service";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    await authorize("report.orgWide");
    const report = await getAttentionReport();

    if (req.nextUrl.searchParams.get("format") === "csv") {
      return csvResponse(
        "assets-needing-attention.csv",
        report.map((a) => ({ assetTag: a.assetTag, name: a.name, reasons: a.reasons.join("; ") }))
      );
    }
    return NextResponse.json({ data: report });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
