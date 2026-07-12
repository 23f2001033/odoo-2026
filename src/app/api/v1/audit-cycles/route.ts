import { apiHandler } from "@/lib/api";
import { auditCycleCreateSchema } from "@/modules/audit/validators";
import { createAuditCycle, listAuditCycles } from "@/modules/audit/service";

// GET is scoped inside the service (admin/asset manager: all; everyone
// else: only cycles they're assigned to as auditor).
export const GET = apiHandler({}, ({ user }) => listAuditCycles(user));

export const POST = apiHandler(
  { permission: "audit.cycle.manage", body: auditCycleCreateSchema },
  ({ user, body }) => createAuditCycle(user, body)
);
