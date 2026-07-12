import { notFound, redirect } from "next/navigation";
import { getAssetByTag } from "@/modules/asset/service";
import { NotFoundError } from "@/lib/errors";

// The QR on every asset label encodes a link to this route (lib/qr.ts), so
// scanning it with any phone camera — not just our in-app scanner — opens
// the asset directly.
export default async function AssetByTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;

  // redirect()/notFound() must NOT be called inside a try/catch — both work
  // by throwing a special Next.js control-flow error, so resolve the lookup
  // first and branch afterward.
  let assetId: string | null = null;
  try {
    assetId = (await getAssetByTag(tag.toUpperCase())).id;
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  if (!assetId) notFound();
  redirect(`/assets/${assetId}`);
}
