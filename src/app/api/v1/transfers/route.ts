import { apiHandler } from "@/lib/api";
import { transferRequestSchema } from "@/modules/allocation/validators";
import { listTransferRequests, requestTransfer } from "@/modules/allocation/service";

// GET is scoped inside the service by role — no extra permission gate.
export const GET = apiHandler({}, ({ user }) => listTransferRequests(user));

export const POST = apiHandler(
  { permission: "transfer.request", body: transferRequestSchema },
  ({ user, body }) => requestTransfer(user, body)
);
