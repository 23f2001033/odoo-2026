import { NextRequest, NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron";
import { errorResponse } from "@/lib/api";
import { scanBookingReminders } from "@/modules/jobs/service";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    assertCronSecret(req);
    const result = await scanBookingReminders();
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
