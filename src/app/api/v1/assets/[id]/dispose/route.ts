import { apiHandler } from "@/lib/api";
import { disposeAsset } from "@/modules/asset/service";

export const POST = apiHandler(
  { permission: "asset.update" },
  ({ user, params }) => disposeAsset(user, params.id)
);
