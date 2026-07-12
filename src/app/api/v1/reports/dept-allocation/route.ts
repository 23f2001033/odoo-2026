import { NextRequest, NextResponse } from "next/server";
import { authorize, errorResponse } from "@/lib/api";
import { csvResponse } from "@/lib/csv";
import { getDepartmentAllocationSummary } from "@/modules/report/service";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    await authorize("report.orgWide");
    const report = await getDepartmentAllocationSummary();

    if (req.nextUrl.searchParams.get("format") === "csv") {
      return csvResponse(
        "department-allocation.csv",
        report.byDepartment.map((d) => ({ department: d.name, activeAllocations: d.count }))
      );
    }
    return NextResponse.json({ data: report });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
