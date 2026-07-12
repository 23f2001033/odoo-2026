import { apiHandler } from "@/lib/api";
import { notificationListSchema } from "@/modules/notification/validators";
import { listNotifications } from "@/modules/notification/service";

export const GET = apiHandler({}, ({ req, user }) => {
  const unreadParam = req.nextUrl.searchParams.get("unread");
  const filters = notificationListSchema.parse({
    unread: unreadParam === null ? undefined : unreadParam === "true",
  });
  return listNotifications(user.id, filters);
});
