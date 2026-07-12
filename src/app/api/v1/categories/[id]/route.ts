import { apiHandler } from "@/lib/api";
import { categoryUpdateSchema } from "@/modules/org/validators";
import { updateCategory } from "@/modules/org/service";

export const PATCH = apiHandler(
  { permission: "org.manage", body: categoryUpdateSchema },
  ({ user, body, params }) => updateCategory(user, params.id, body)
);
