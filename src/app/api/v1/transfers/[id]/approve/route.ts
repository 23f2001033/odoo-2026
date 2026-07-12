import { apiHandler } from "@/lib/api";
import { transferApproveSchema } from "@/modules/allocation/validators";
import { approveTransfer } from "@/modules/allocation/service";

// Department-head scoping (own department only) is enforced inside the
// service, since it depends on the specific transfer's source/target.
export const POST = apiHandler(
  { permission: "transfer.approve", body: transferApproveSchema },
  ({ user, body, params }) => approveTransfer(user, params.id, body)
);
