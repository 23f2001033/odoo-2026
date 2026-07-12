import { apiHandler } from "@/lib/api";
import { getUnreadCount } from "@/modules/notification/service";

// Polled every 30s by the bell icon — a dedicated lightweight endpoint so
// the badge doesn't need to fetch and count the full notification list.
export const GET = apiHandler({}, async ({ user }) => ({ count: await getUnreadCount(user.id) }));
