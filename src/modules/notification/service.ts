import { Prisma, NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { NotificationListInput } from "./validators";

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
};

// Always called from inside another module's transaction so the notification
// commits atomically with whatever state change triggered it (docs/04 §8) —
// this is the single write path every domain service uses.
export function createNotification(tx: Prisma.TransactionClient, input: NotificationInput) {
  return tx.notification.create({ data: input });
}

const LIST_LIMIT = 50;

export function listNotifications(userId: string, filters: NotificationListInput) {
  const where: Prisma.NotificationWhereInput = { userId };
  if (filters.unread) where.readAt = null;

  return db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
  });
}

export function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await db.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError("Notification", notificationId);
  if (notification.userId !== userId) throw new ForbiddenError("This notification isn't yours");
  if (notification.readAt) return notification; // already read, idempotent no-op

  return db.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
}

export async function markAllAsRead(userId: string) {
  const { count } = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { count };
}
