import { apiHandler } from "@/lib/api";
import { markAsRead } from "@/modules/notification/service";

export const POST = apiHandler({}, ({ user, params }) => markAsRead(user.id, params.id));
