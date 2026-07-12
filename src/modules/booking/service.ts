import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { SessionUser } from "@/lib/authz";
import { assertTransition, bookingDisplayStatus, bookingMachine } from "@/lib/stateMachine";
import { createNotification } from "@/modules/notification/service";
import { BookingCreateInput, BookingListInput, BookingRescheduleInput } from "./validators";

const BOOKING_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true } },
  bookedBy: { select: { id: true, name: true, departmentId: true } },
  forDept: { select: { id: true, name: true } },
} satisfies Prisma.BookingInclude;

function formatRange(start: Date, end: Date) {
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Half-open overlap test mirroring the DB's tsrange '[)' exclusion constraint
// exactly (docs/04 §5.2): two ranges [a,b) and [c,d) overlap iff a<d AND c<b.
// This makes 9:00–10:00 vs 10:00–11:00 NOT overlap (boundary touch, allowed)
// and 9:00–10:00 vs 9:30–10:30 overlap (rejected) — the spec's own example.
async function assertNoOverlap(assetId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
  const conflict = await db.booking.findFirst({
    where: {
      assetId,
      status: "CONFIRMED",
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (conflict) {
    throw new ConflictError(
      `This slot overlaps an existing booking (${formatRange(conflict.startsAt, conflict.endsAt)})`,
      { conflictingBookingId: conflict.id }
    );
  }
}

// Race fallback: the pre-check above handles the common case, but the DB's
// exclusion constraint (not a @@unique Prisma knows about, since it was
// added via raw SQL) is the actual source of truth under concurrency. Prisma
// can't classify it into a known error code, so detect it by the constraint
// name Postgres includes in the raw message and remap to the same friendly
// shape either way — never let a caller see a raw DB error here.
function mapOverlapError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("no_booking_overlap")) {
    throw new ConflictError("This slot was just booked by someone else — please choose another time");
  }
  throw err;
}

export async function createBooking(actor: SessionUser, input: BookingCreateInput) {
  const asset = await db.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) throw new NotFoundError("Asset", input.assetId);
  if (!asset.isBookable) throw new ConflictError("This asset is not a shared/bookable resource");

  await assertNoOverlap(input.assetId, input.startsAt, input.endsAt);

  try {
    return await db.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          assetId: input.assetId,
          bookedById: actor.id,
          forDeptId: input.forDeptId ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          purpose: input.purpose ?? null,
        },
        include: BOOKING_INCLUDE,
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.id,
          action: "booking.created",
          entityType: "Asset",
          entityId: input.assetId,
          meta: { bookingId: booking.id, startsAt: input.startsAt, endsAt: input.endsAt },
        },
      });
      await createNotification(tx, {
        userId: actor.id,
        type: "BOOKING_CONFIRMED",
        title: "Booking confirmed",
        body: `${asset.name} booked for ${formatRange(input.startsAt, input.endsAt)}.`,
        entityType: "Asset",
        entityId: input.assetId,
      });
      return booking;
    });
  } catch (err) {
    throw mapOverlapError(err);
  }
}

// Own bookings always manageable; Dept Heads may manage bookings made for
// their department or by one of their own people (role table: "Books shared
// resources on behalf of the department"); Asset Manager/Admin have general
// housekeeping authority, matching the pattern used for allocations/transfers.
function canManageBooking(
  actor: SessionUser,
  booking: { bookedById: string; forDeptId: string | null; bookedBy: { departmentId: string | null } }
): boolean {
  if (booking.bookedById === actor.id) return true;
  if (actor.role === "ASSET_MANAGER" || actor.role === "ADMIN") return true;
  if (actor.role === "DEPT_HEAD") {
    return booking.forDeptId === actor.departmentId || booking.bookedBy.departmentId === actor.departmentId;
  }
  return false;
}

async function loadForManage(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { asset: true, bookedBy: { select: { id: true, name: true, departmentId: true } } },
  });
  if (!booking) throw new NotFoundError("Booking", bookingId);
  return booking;
}

export async function cancelBooking(actor: SessionUser, bookingId: string) {
  const booking = await loadForManage(bookingId);
  if (!canManageBooking(actor, booking)) {
    throw new ForbiddenError("You can only cancel your own bookings");
  }
  assertTransition(bookingMachine, booking.status, "CANCELLED");
  if (new Date() >= booking.endsAt) {
    throw new ConflictError("This booking has already ended");
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
      include: BOOKING_INCLUDE,
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "booking.cancelled",
        entityType: "Asset",
        entityId: booking.assetId,
        meta: { bookingId },
      },
    });
    if (booking.bookedById !== actor.id) {
      await createNotification(tx, {
        userId: booking.bookedById,
        type: "BOOKING_CANCELLED",
        title: "Booking cancelled",
        body: `Your booking for ${booking.asset.name} (${formatRange(booking.startsAt, booking.endsAt)}) was cancelled.`,
        entityType: "Asset",
        entityId: booking.assetId,
      });
    }
    return updated;
  });
}

export async function rescheduleBooking(actor: SessionUser, bookingId: string, input: BookingRescheduleInput) {
  const booking = await loadForManage(bookingId);
  if (!canManageBooking(actor, booking)) {
    throw new ForbiddenError("You can only reschedule your own bookings");
  }
  if (booking.status !== "CONFIRMED") throw new ConflictError("This booking is not active");

  await assertNoOverlap(booking.assetId, input.startsAt, input.endsAt, bookingId);

  try {
    return await db.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { startsAt: input.startsAt, endsAt: input.endsAt, reminderSentAt: null },
        include: BOOKING_INCLUDE,
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.id,
          action: "booking.rescheduled",
          entityType: "Asset",
          entityId: booking.assetId,
          meta: { bookingId, from: { startsAt: booking.startsAt, endsAt: booking.endsAt }, to: { startsAt: input.startsAt, endsAt: input.endsAt } },
        },
      });
      return updated;
    });
  } catch (err) {
    throw mapOverlapError(err);
  }
}

export async function listBookings(filters: BookingListInput) {
  const where: Prisma.BookingWhereInput = {};
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.from) where.endsAt = { gt: filters.from };
  if (filters.to) where.startsAt = { lt: filters.to };

  const bookings = await db.booking.findMany({
    where,
    include: BOOKING_INCLUDE,
    orderBy: { startsAt: "asc" },
  });
  return bookings.map((b) => ({ ...b, displayStatus: bookingDisplayStatus(b) }));
}
