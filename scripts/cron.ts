/**
 * Local dev job scheduler — run alongside `npm run dev` with `npm run cron`.
 * Hits the same /api/jobs/* endpoints Vercel Cron would call in production
 * (docs/04 §1: "Locally: node-cron script hitting the same endpoints —
 * same code path"). Not started automatically; the app works correctly
 * without it since "overdue" is always derived live (docs/04 §8) — this
 * script only adds the proactive notifications.
 */
import cron from "node-cron";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET; // optional in dev — see lib/cron.ts

async function trigger(path: string) {
  const res = await fetch(`${APP_URL}/api/jobs/${path}`, {
    method: "POST",
    headers: CRON_SECRET ? { "x-cron-secret": CRON_SECRET } : undefined,
  });
  const json = await res.json().catch(() => null);
  const stamp = new Date().toLocaleTimeString();
  if (!res.ok) {
    console.error(`[cron ${stamp}] ${path} failed (${res.status}):`, json?.error?.message ?? res.statusText);
    return;
  }
  console.log(`[cron ${stamp}] ${path}:`, json?.data);
}

cron.schedule("0 * * * *", () => trigger("scan-overdue")); // hourly
cron.schedule("*/5 * * * *", () => trigger("booking-reminders")); // every 5 minutes

console.log(`Local job scheduler running against ${APP_URL} — scan-overdue hourly, booking-reminders every 5 min.`);
console.log("Triggering both once now so the demo has something to show immediately…");
trigger("scan-overdue");
trigger("booking-reminders");
