import { db } from "@/lib/db";
import { createNotification } from "@/modules/notification/service";

// Both jobs are idempotent by construction (docs/04 §8): "overdue" itself is
// a derived flag computed live everywhere it's displayed (dashboard,
// allocations list), so these jobs only ADD notifications — the app stays
// correct even if a job never runs, is delayed, or double-fires.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Hourly: notify the holder + allocating manager once per 24h window per
// overdue allocation, checked via "was a notification already sent
// recently" rather than a stored flag (keeps this job stateless/re-runnable).
export async function scanOverdueAllocations() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - ONE_DAY_MS);

  const overdue = await db.allocation.findMany({
    where: { status: "ACTIVE", expectedReturnAt: { lt: now } },
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      holderUser: { select: { id: true, name: true } },
      holderDept: { select: { id: true, name: true, headId: true } },
    },
  });

  let notified = 0;
  for (const a of overdue) {
    const recipientId = a.holderUserId ?? a.holderDept?.headId ?? null;
    if (!recipientId) continue; // department with no head assigned — nobody to notify

    const alreadySent = await db.notification.findFirst({
      where: { userId: recipientId, type: "OVERDUE_RETURN", entityId: a.assetId, createdAt: { gte: dayAgo } },
    });
    if (alreadySent) continue;

    const holderLabel = a.holderUser?.name ?? a.holderDept?.name ?? "the current holder";
    const dueDate = a.expectedReturnAt!.toLocaleDateString();

    await db.$transaction(async (tx) => {
      await createNotification(tx, {
        userId: recipientId,
        type: "OVERDUE_RETURN",
        title: "Overdue return",
        body: `${a.asset.name} (${a.asset.assetTag}) was due back on ${dueDate}.`,
        entityType: "Asset",
        entityId: a.assetId,
      });
      if (a.allocatedById !== recipientId) {
        await createNotification(tx, {
          userId: a.allocatedById,
          type: "OVERDUE_RETURN",
          title: "Overdue return — action may be needed",
          body: `${holderLabel} has not returned ${a.asset.name} (${a.asset.assetTag}), due ${dueDate}.`,
          entityType: "Asset",
          entityId: a.assetId,
        });
      }
    });
    notified++;
  }

  return { scanned: overdue.length, notified };
}

// Every 5 minutes: bookings starting within 30 minutes with no reminder sent
// yet. reminderSentAt IS NULL is the idempotency guard — once stamped, a
// booking is never re-notified even if this job runs again immediately.
export async function scanBookingReminders() {
  const now = new Date();
  const in30Min = new Date(now.getTime() + 30 * 60 * 1000);

  const upcoming = await db.booking.findMany({
    where: { status: "CONFIRMED", startsAt: { gte: now, lte: in30Min }, reminderSentAt: null },
    include: { asset: { select: { id: true, assetTag: true, name: true } } },
  });

  for (const b of upcoming) {
    await db.$transaction(async (tx) => {
      await createNotification(tx, {
        userId: b.bookedById,
        type: "BOOKING_REMINDER",
        title: "Booking starting soon",
        body: `${b.asset.name} (${b.asset.assetTag}) starts at ${b.startsAt.toLocaleTimeString()}.`,
        entityType: "Asset",
        entityId: b.assetId,
      });
      await tx.booking.update({ where: { id: b.id }, data: { reminderSentAt: new Date() } });
    });
  }

  return { scanned: upcoming.length, notified: upcoming.length };
}
