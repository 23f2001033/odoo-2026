import { apiHandler } from "@/lib/api";
import { requestReturn } from "@/modules/allocation/service";

export const POST = apiHandler(
  { permission: "return.request" },
  ({ user, params }) => requestReturn(user, params.id)
);
