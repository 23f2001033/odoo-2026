import { apiHandler } from "@/lib/api";
import { departmentCreateSchema } from "@/modules/org/validators";
import { createDepartment, listDepartments } from "@/modules/org/service";

// Any authenticated user may list departments (needed by booking/allocation forms).
export const GET = apiHandler({}, () => listDepartments());

export const POST = apiHandler(
  { permission: "org.manage", body: departmentCreateSchema },
  ({ user, body }) => createDepartment(user, body)
);
