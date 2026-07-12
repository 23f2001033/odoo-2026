import { apiHandler } from "@/lib/api";
import { assetUpdateSchema } from "@/modules/asset/validators";
import { getAssetById, updateAsset } from "@/modules/asset/service";

export const GET = apiHandler({}, ({ params }) => getAssetById(params.id));

export const PATCH = apiHandler(
  { permission: "asset.update", body: assetUpdateSchema },
  ({ user, body, params }) => updateAsset(user, params.id, body)
);
