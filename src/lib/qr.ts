import QRCode from "qrcode";
import { config } from "./config";

// Encodes a link to the by-tag redirect route, so scanning the printed QR
// with any phone camera (not just our in-app scanner) opens the asset
// directly — the "make it physical" differentiator (docs/03 §3).
export function assetQrUrl(assetTag: string): string {
  return `${config.APP_URL}/assets/by-tag/${assetTag}`;
}

export function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 240 });
}
