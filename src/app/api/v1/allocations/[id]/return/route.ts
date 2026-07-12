import { apiHandler } from "@/lib/api";
import { returnSchema } from "@/modules/allocation/validators";
import { returnAllocation } from "@/modules/allocation/service";

export const POST = apiHandler(
  { permission: "return.approve", body: returnSchema },
  ({ user, body, params }) => returnAllocation(user, params.id, body)
);
