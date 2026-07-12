import { apiHandler } from "@/lib/api";
import { departmentUpdateSchema } from "@/modules/org/validators";
import { updateDepartment } from "@/modules/org/service";

export const PATCH = apiHandler(
  { permission: "org.manage", body: departmentUpdateSchema },
  ({ user, body, params }) => updateDepartment(user, params.id, body)
);
