import { NextRequest, NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron";
import { errorResponse } from "@/lib/api";
import { scanOverdueAllocations } from "@/modules/jobs/service";

// Cron-triggered, not user-authenticated — excluded from the auth
// middleware matcher (src/middleware.ts) and gated by CRON_SECRET instead.
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    assertCronSecret(req);
    const result = await scanOverdueAllocations();
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
