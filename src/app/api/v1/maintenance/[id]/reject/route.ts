import { apiHandler } from "@/lib/api";
import { maintenanceRejectSchema } from "@/modules/maintenance/validators";
import { rejectMaintenance } from "@/modules/maintenance/service";

export const POST = apiHandler(
  { permission: "maintenance.approve", body: maintenanceRejectSchema },
  ({ user, body, params }) => rejectMaintenance(user, params.id, body)
);
