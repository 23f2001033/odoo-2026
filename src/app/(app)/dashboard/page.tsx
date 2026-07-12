import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/authz";

export const metadata = { title: "Dashboard" };

// KPI queries are live counts — "overdue" is derived from time (docs/04 §8),
// so this page is correct even if no cron job has ever run.
async function getKpis() {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const [
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns,
  ] = await Promise.all([
    db.asset.count({ where: { status: "AVAILABLE" } }),
    db.asset.count({ where: { status: "ALLOCATED" } }),
    db.maintenanceRequest.count({
      where: {
        status: { in: ["APPROVED", "ASSIGNED", "IN_PROGRESS"] },
        updatedAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    db.booking.count({
      where: { status: "CONFIRMED", startsAt: { lte: now }, endsAt: { gt: now } },
    }),
    db.transferRequest.count({ where: { status: "REQUESTED" } }),
    db.allocation.count({
      where: { status: "ACTIVE", expectedReturnAt: { gte: now, lte: in7days } },
    }),
    db.allocation.count({
      where: { status: "ACTIVE", expectedReturnAt: { lt: now } },
    }),
  ]);

  return {
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const kpis = await getKpis();

  const cards = [
    { label: "Assets Available", value: kpis.assetsAvailable },
    { label: "Assets Allocated", value: kpis.assetsAllocated },
    { label: "Maintenance Today", value: kpis.maintenanceToday },
    { label: "Active Bookings", value: kpis.activeBookings },
    { label: "Pending Transfers", value: kpis.pendingTransfers },
    { label: "Upcoming Returns", value: kpis.upcomingReturns },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.name?.split(" ")[0]} — here&apos;s your operational snapshot
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission(user, "asset.register") && (
            <Button size="sm" render={<Link href="/assets/register" />}>
              Register Asset
            </Button>
          )}
          <Button size="sm" variant="outline" render={<Link href="/bookings" />}>
            Book Resource
          </Button>
          <Button size="sm" variant="outline" render={<Link href="/maintenance" />}>
            Raise Maintenance
          </Button>
        </div>
      </div>

      {kpis.overdueReturns > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm font-medium text-destructive">
              ⚠ {kpis.overdueReturns} allocation{kpis.overdueReturns > 1 ? "s are" : " is"} past
              the expected return date
            </p>
            <Button size="sm" variant="destructive" render={<Link href="/allocations?filter=overdue" />}>
              Review overdue
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="min-h-10 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
