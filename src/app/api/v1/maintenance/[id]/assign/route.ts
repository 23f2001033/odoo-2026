import { apiHandler } from "@/lib/api";
import { maintenanceAssignSchema } from "@/modules/maintenance/validators";
import { assignTechnician } from "@/modules/maintenance/service";

export const POST = apiHandler(
  { permission: "maintenance.progress", body: maintenanceAssignSchema },
  ({ user, body, params }) => assignTechnician(user, params.id, body)
);
