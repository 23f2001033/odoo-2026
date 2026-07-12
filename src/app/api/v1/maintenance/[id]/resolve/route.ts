import { apiHandler } from "@/lib/api";
import { maintenanceResolveSchema } from "@/modules/maintenance/validators";
import { resolveMaintenance } from "@/modules/maintenance/service";

export const POST = apiHandler(
  { permission: "maintenance.progress", body: maintenanceResolveSchema },
  ({ user, body, params }) => resolveMaintenance(user, params.id, body)
);
