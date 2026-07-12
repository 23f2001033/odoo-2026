import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api";
import { assetCreateSchema, assetSearchSchema } from "@/modules/asset/validators";
import { registerAsset, searchAssets } from "@/modules/asset/service";

// GET is unrestricted to any authenticated user (directory is read-only for
// employees); only registration (POST) requires asset.register.
export const GET = apiHandler({}, ({ req }) => searchAssets(parseSearchParams(req)));

export const POST = apiHandler(
  { permission: "asset.register", body: assetCreateSchema },
  ({ user, body }) => registerAsset(user, body)
);

// Normalizes raw query-string values before zod sees them — in particular
// the boolean "bookable" flag, since z.coerce.boolean() would treat the
// literal string "false" as truthy (classic zod query-param pitfall).
function parseSearchParams(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const raw: Record<string, unknown> = Object.fromEntries(sp.entries());
  if (sp.has("bookable")) raw.bookable = sp.get("bookable") === "true";
  return assetSearchSchema.parse(raw);
}
