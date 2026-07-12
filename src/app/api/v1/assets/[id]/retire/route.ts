import { apiHandler } from "@/lib/api";
import { retireAsset } from "@/modules/asset/service";

export const POST = apiHandler(
  { permission: "asset.update" },
  ({ user, params }) => retireAsset(user, params.id)
);
