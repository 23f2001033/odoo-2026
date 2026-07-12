import { Prisma, NotificationType } from "@prisma/client";

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
// this is the single write path every domain service uses. Listing, mark-read,
// and email delivery are built out in the dedicated notifications milestone.
export function createNotification(tx: Prisma.TransactionClient, input: NotificationInput) {
  return tx.notification.create({ data: input });
}
