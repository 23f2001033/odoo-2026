import { apiHandler } from "@/lib/api";
import { auditItemCheckSchema } from "@/modules/audit/validators";
import { checkAuditItem } from "@/modules/audit/service";

// Auditor is a capability, not a role (docs/04 §4) — checked against
// AuditAssignment rows inside the service, so no permission gate here beyond
// "must be signed in."
export const POST = apiHandler(
  { body: auditItemCheckSchema },
  ({ user, body, params }) => checkAuditItem(user, params.id, params.itemId, body)
);
