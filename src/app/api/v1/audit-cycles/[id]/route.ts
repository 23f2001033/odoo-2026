import { apiHandler } from "@/lib/api";
import { getAuditCycleDetail } from "@/modules/audit/service";

// Access scoping (admin/asset manager: all; assigned auditors: their own
// cycles) is enforced inside the service.
export const GET = apiHandler({}, ({ user, params }) => getAuditCycleDetail(user, params.id));
