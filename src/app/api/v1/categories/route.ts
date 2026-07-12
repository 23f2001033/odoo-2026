import { apiHandler } from "@/lib/api";
import { categoryCreateSchema } from "@/modules/org/validators";
import { createCategory, listCategories } from "@/modules/org/service";

export const GET = apiHandler({}, () => listCategories());

export const POST = apiHandler(
  { permission: "org.manage", body: categoryCreateSchema },
  ({ user, body }) => createCategory(user, body)
);
