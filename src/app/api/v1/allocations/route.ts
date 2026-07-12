import { apiHandler } from "@/lib/api";
import { allocationCreateSchema, allocationSearchSchema } from "@/modules/allocation/validators";
import { allocateAsset, listAllocations } from "@/modules/allocation/service";

// GET is scoped inside the service (employee: own; dept head: own dept;
// manager/admin: all) — no extra permission gate needed here.
export const GET = apiHandler({}, ({ req, user }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return listAllocations(user, allocationSearchSchema.parse(params));
});

export const POST = apiHandler(
  { permission: "asset.allocate", body: allocationCreateSchema },
  ({ user, body }) => allocateAsset(user, body)
);
