import { apiHandler } from "@/lib/api";
import { closeAuditCycle } from "@/modules/audit/service";

export const POST = apiHandler(
  { permission: "audit.cycle.manage" },
  ({ user, params }) => closeAuditCycle(user, params.id)
);
