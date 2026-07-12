import Link from "next/link";
import { auth } from "@/auth";
import { normalizeSessionUser } from "@/lib/authz";
import { listBookings } from "@/modules/booking/service";
import { searchAssets } from "@/modules/asset/service";
import { listDepartments } from "@/modules/org/service";
import { Button } from "@/components/ui/button";
import { BookingAssetSelect } from "@/components/bookings/booking-asset-select";
import { WeekCalendar } from "@/components/bookings/week-calendar";
import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { BookingList, BookingRow } from "@/components/bookings/booking-list";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const metadata = { title: "Resource Booking" };

type SearchParams = Record<string, string | string[] | undefined>;

function startOfWeek(d: Date): Date {
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return monday;
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();
  const user = normalizeSessionUser(session!.user);

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const [bookableAssets, departments] = await Promise.all([
    searchAssets({ bookable: true, page: 1, pageSize: 100 }),
    listDepartments(),
  ]);
  const assets = bookableAssets.items.map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name }));

  if (assets.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Resource Booking</h1>
        <p className="text-sm text-muted-foreground">
          No bookable resources yet.{" "}
          <Link href="/assets/register" className="text-primary hover:underline">
            Register one
          </Link>{" "}
          and mark it as a shared/bookable resource.
        </p>
      </div>
    );
  }

  const selectedAssetId = one(sp.assetId) && assets.some((a) => a.id === one(sp.assetId))
    ? (one(sp.assetId) as string)
    : assets[0].id;

  const weekParam = one(sp.week);
  const referenceDate = weekParam && !Number.isNaN(Date.parse(weekParam)) ? new Date(weekParam) : new Date();
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const prevWeek = new Date(weekStart); prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart); nextWeek.setDate(nextWeek.getDate() + 7);

  const bookings = await listBookings({ assetId: selectedAssetId });

  const calendarBookings = bookings.map((b) => ({
    id: b.id,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    displayStatus: b.displayStatus,
    bookedBy: { name: b.bookedBy.name },
    purpose: b.purpose,
  }));

  // Upcoming/ongoing/cancelled always shown; completed bookings only stay in
  // view for a week so the list doesn't grow unbounded with ancient history.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const listRows: BookingRow[] = bookings
    .filter((b) => b.displayStatus !== "COMPLETED" || b.endsAt > sevenDaysAgo)
    .map((b) => ({
      id: b.id,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      purpose: b.purpose,
      displayStatus: b.displayStatus,
      bookedBy: b.bookedBy,
      forDept: b.forDept,
    }));

  const weekLabel = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " – " + new Date(weekEnd.getTime() - 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Booking</h1>
          <p className="text-sm text-muted-foreground">Time-slot booking with automatic overlap prevention</p>
        </div>
        <NewBookingDialog
          assets={assets}
          defaultAssetId={selectedAssetId}
          departments={departments.filter((d) => d.status === "ACTIVE").map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <BookingAssetSelect assets={assets} selectedId={selectedAssetId} />
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm" variant="outline"
            render={<Link href={`/bookings?assetId=${selectedAssetId}&week=${prevWeek.toISOString()}`} />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">{weekLabel}</span>
          <Button
            size="icon-sm" variant="outline"
            render={<Link href={`/bookings?assetId=${selectedAssetId}&week=${nextWeek.toISOString()}`} />}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <WeekCalendar weekStart={weekStart.toISOString()} bookings={calendarBookings} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Bookings</h2>
        <BookingList bookings={listRows} currentUser={user} />
      </div>
    </div>
  );
}
