import { apiHandler } from "@/lib/api";
import { activitySearchSchema } from "@/modules/activity/validators";
import { listActivityLog } from "@/modules/activity/service";

// Scoped inside the service (admin/asset manager: org-wide + filterable by
// actor; everyone else: their own actions only).
export const GET = apiHandler({}, ({ req, user }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return listActivityLog(user, activitySearchSchema.parse(params));
});
