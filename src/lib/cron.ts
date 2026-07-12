import { NextRequest } from "next/server";
import { config } from "./config";
import { UnauthorizedError } from "./errors";

// If CRON_SECRET is unset, jobs are open — the local dev fallback (docs/04
// §11: "fallback: jobs open in dev only"). Set it in production so a random
// visitor can't trigger notification spam by POSTing the job routes.
export function assertCronSecret(req: NextRequest): void {
  if (!config.CRON_SECRET) return;
  const provided = req.headers.get("x-cron-secret");
  if (provided !== config.CRON_SECRET) {
    throw new UnauthorizedError("Invalid or missing cron secret");
  }
}
