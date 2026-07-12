import { apiHandler } from "@/lib/api";
import { transferRejectSchema } from "@/modules/allocation/validators";
import { rejectTransfer } from "@/modules/allocation/service";

export const POST = apiHandler(
  { permission: "transfer.approve", body: transferRejectSchema },
  ({ user, body, params }) => rejectTransfer(user, params.id, body)
);
