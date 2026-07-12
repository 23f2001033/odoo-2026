import { apiHandler } from "@/lib/api";
import { approveMaintenance } from "@/modules/maintenance/service";

export const POST = apiHandler(
  { permission: "maintenance.approve" },
  ({ user, params }) => approveMaintenance(user, params.id)
);
