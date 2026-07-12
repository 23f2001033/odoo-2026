import { apiHandler } from "@/lib/api";
import { employeeUpdateSchema } from "@/modules/org/validators";
import { updateEmployee } from "@/modules/org/service";

export const PATCH = apiHandler(
  { permission: "org.manage", body: employeeUpdateSchema },
  ({ user, body, params }) => updateEmployee(user, params.id, body)
);
