import { apiHandler } from "@/lib/api";
import { maintenanceCreateSchema, maintenanceSearchSchema } from "@/modules/maintenance/validators";
import { listMaintenanceRequests, raiseMaintenance } from "@/modules/maintenance/service";

// GET is scoped inside the service (employee: own + assets they hold; dept
// head: + own department; manager/admin: all).
export const GET = apiHandler({}, ({ req, user }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return listMaintenanceRequests(user, maintenanceSearchSchema.parse(params));
});

export const POST = apiHandler(
  { permission: "maintenance.raise", body: maintenanceCreateSchema },
  ({ user, body }) => raiseMaintenance(user, body)
);
