import { apiHandler } from "@/lib/api";
import { markAllAsRead } from "@/modules/notification/service";

export const POST = apiHandler({}, ({ user }) => markAllAsRead(user.id));
