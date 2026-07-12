import { db } from "@/lib/db";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─────────────────────────── utilization ───────────────────────────
//
// "Utilization" spans two different usage mechanisms (long-term allocation
// and time-slot booking), so it's computed as hours-in-use from both,
// clamped to the requested period, and summed per asset. This is a rough
// proxy (some double-counting is possible if a bookable asset also carries
// an allocation) — acceptable for a dashboard ranking, not a billing system.
export async function getUtilizationReport(periodDays: number) {
  const since = daysAgo(periodDays);
  const now = new Date();

  const [assets, allocations, bookings] = await Promise.all([
    db.asset.findMany({
      where: { status: { not: "DISPOSED" } },
      select: { id: true, assetTag: true, name: true, status: true, isBookable: true },
    }),
    db.allocation.findMany({
      where: { OR: [{ status: "ACTIVE" }, { returnedAt: { gte: since } }] },
      select: { assetId: true, allocatedAt: true, returnedAt: true },
    }),
    db.booking.findMany({
      where: { status: "CONFIRMED", startsAt: { lt: now }, endsAt: { gte: since } },
      select: { assetId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const hoursByAsset = new Map<string, number>();
  const addHours = (assetId: string, start: Date, end: Date) => {
    const clampedStart = start > since ? start : since;
    const ms = Math.max(0, end.getTime() - clampedStart.getTime());
    hoursByAsset.set(assetId, (hoursByAsset.get(assetId) ?? 0) + ms / 3_600_000);
  };

  for (const a of allocations) addHours(a.assetId, a.allocatedAt, a.returnedAt ?? now);
  for (const b of bookings) addHours(b.assetId, b.startsAt, b.endsAt < now ? b.endsAt : now);

  const withHours = assets.map((a) => ({ ...a, hours: Math.round(hoursByAsset.get(a.id) ?? 0) }));
  const mostUsed = [...withHours].filter((a) => a.hours > 0).sort((a, b) => b.hours - a.hours).slice(0, 10);
  const idle = withHours.filter((a) => a.hours === 0 && a.status === "AVAILABLE");

  return { mostUsed, idle, periodDays };
}

// ─────────────────────────── maintenance frequency ───────────────────────────

export async function getMaintenanceFrequencyReport(periodDays: number) {
  const since = daysAgo(periodDays);

  const requests = await db.maintenanceRequest.findMany({
    where: { createdAt: { gte: since } },
    select: {
      assetId: true,
      asset: { select: { assetTag: true, name: true, categoryId: true, category: { select: { name: true } } } },
    },
  });

  const byCategory = new Map<string, { name: string; count: number }>();
  const byAsset = new Map<string, { assetTag: string; name: string; count: number }>();

  for (const r of requests) {
    const cat = byCategory.get(r.asset.categoryId) ?? { name: r.asset.category.name, count: 0 };
    cat.count++;
    byCategory.set(r.asset.categoryId, cat);

    const a = byAsset.get(r.assetId) ?? { assetTag: r.asset.assetTag, name: r.asset.name, count: 0 };
    a.count++;
    byAsset.set(r.assetId, a);
  }

  return {
    byCategory: [...byCategory.values()].sort((a, b) => b.count - a.count),
    topAssets: [...byAsset.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    periodDays,
  };
}

// ─────────────────────────── attention list ───────────────────────────
//
// No preventive-maintenance schedule exists in the data model (spec scopes
// that as a stretch goal — docs/03 P2), so "due for maintenance or nearing
// retirement" is approximated by two explainable, computable heuristics
// rather than invented as a hard prediction: repeated repairs recently, or
// an old acquisition date. Each reason is shown, not just a flag.
const RETIREMENT_THRESHOLD_DAYS = 3 * 365;
const FREQUENT_REPAIR_WINDOW_DAYS = 90;
const FREQUENT_REPAIR_MIN_COUNT = 2;

export async function getAttentionReport() {
  const retirementThreshold = daysAgo(RETIREMENT_THRESHOLD_DAYS);
  const repairWindowStart = daysAgo(FREQUENT_REPAIR_WINDOW_DAYS);

  const [oldAssets, repairCounts] = await Promise.all([
    db.asset.findMany({
      where: { status: { notIn: ["RETIRED", "DISPOSED"] }, acquisitionDate: { lt: retirementThreshold } },
      select: { id: true, assetTag: true, name: true, acquisitionDate: true },
    }),
    db.maintenanceRequest.groupBy({
      by: ["assetId"],
      where: { createdAt: { gte: repairWindowStart } },
      _count: { assetId: true },
    }),
  ]);

  const frequentAssetIds = repairCounts
    .filter((r) => r._count.assetId >= FREQUENT_REPAIR_MIN_COUNT)
    .map((r) => ({ assetId: r.assetId, count: r._count.assetId }));

  const frequentAssets = frequentAssetIds.length
    ? await db.asset.findMany({
        where: { id: { in: frequentAssetIds.map((f) => f.assetId) } },
        select: { id: true, assetTag: true, name: true },
      })
    : [];

  const flagged = new Map<string, { assetTag: string; name: string; reasons: string[] }>();

  for (const a of oldAssets) {
    const years = Math.floor((Date.now() - a.acquisitionDate!.getTime()) / (365 * 24 * 3_600_000));
    flagged.set(a.id, { assetTag: a.assetTag, name: a.name, reasons: [`Acquired ${years}+ years ago`] });
  }
  for (const f of frequentAssetIds) {
    const detail = frequentAssets.find((d) => d.id === f.assetId);
    if (!detail) continue;
    const reason = `${f.count} repairs in the last ${FREQUENT_REPAIR_WINDOW_DAYS} days`;
    const existing = flagged.get(f.assetId);
    if (existing) existing.reasons.push(reason);
    else flagged.set(f.assetId, { assetTag: detail.assetTag, name: detail.name, reasons: [reason] });
  }

  return [...flagged.values()];
}

// ─────────────────────────── department allocation summary ───────────────────────────

export async function getDepartmentAllocationSummary() {
  const allocations = await db.allocation.findMany({
    where: { status: "ACTIVE" },
    select: {
      holderDeptId: true,
      holderDept: { select: { name: true } },
      holderUser: { select: { departmentId: true, department: { select: { name: true } } } },
    },
  });

  const byDept = new Map<string, { name: string; count: number }>();
  let unassigned = 0;

  for (const a of allocations) {
    const deptId = a.holderDeptId ?? a.holderUser?.departmentId ?? null;
    const deptName = a.holderDept?.name ?? a.holderUser?.department?.name ?? null;
    if (!deptId || !deptName) {
      unassigned++;
      continue;
    }
    const entry = byDept.get(deptId) ?? { name: deptName, count: 0 };
    entry.count++;
    byDept.set(deptId, entry);
  }

  return { byDepartment: [...byDept.values()].sort((a, b) => b.count - a.count), unassigned };
}

// ─────────────────────────── booking heatmap ───────────────────────────
//
// Monday=0..Sunday=6 rows x 24 hour columns; each cell counts bookings whose
// span touches that hour. Capped iteration guards against a malformed
// multi-week booking spinning the loop.
export async function getBookingHeatmap(periodDays: number) {
  const since = daysAgo(periodDays);

  const bookings = await db.booking.findMany({
    where: { status: "CONFIRMED", startsAt: { gte: since } },
    select: { startsAt: true, endsAt: true },
  });

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const b of bookings) {
    const cursor = new Date(b.startsAt);
    let steps = 0;
    while (cursor < b.endsAt && steps < 24 * 14) {
      const day = (cursor.getDay() + 6) % 7;
      grid[day][cursor.getHours()]++;
      cursor.setHours(cursor.getHours() + 1);
      steps++;
    }
  }

  return { grid, periodDays };
}
