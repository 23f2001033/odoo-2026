import { apiHandler } from "@/lib/api";
import { getAssetByTag } from "@/modules/asset/service";

// Used by the camera QR-scanner component to resolve decoded text to an
// asset id before navigating (docs/04 §7).
export const GET = apiHandler({}, ({ params }) => getAssetByTag(params.tag));
