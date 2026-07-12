import { apiHandler } from "@/lib/api";
import { startMaintenance } from "@/modules/maintenance/service";

export const POST = apiHandler(
  { permission: "maintenance.progress" },
  ({ user, params }) => startMaintenance(user, params.id)
);
