import { apiHandler } from "@/lib/api";
import { roleAssignSchema } from "@/modules/org/validators";
import { assignRole } from "@/modules/org/service";

// The only endpoint that changes roles — admin-gated (spec: no self-assigned roles).
export const PATCH = apiHandler(
  { permission: "role.assign", body: roleAssignSchema },
  ({ user, body, params }) => assignRole(user, params.id, body)
);
