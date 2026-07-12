import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { config } from "@/lib/config";

// One interface, swappable implementation (docs/04 §2, §8) — nothing else in
// the codebase knows whether files land on disk or in cloud storage.
export interface FileStorage {
  put(file: File): Promise<{ url: string }>;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

// Dev/offline fallback: writes into public/uploads, served by Next's static
// file handler. The app must run fully on a laptop with no cloud creds set.
class LocalDiskStorage implements FileStorage {
  private readonly dir = path.join(process.cwd(), "public", "uploads");

  async put(file: File): Promise<{ url: string }> {
    if (file.size > MAX_BYTES) throw new Error("File too large (max 8MB)");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`);

    await mkdir(this.dir, { recursive: true });
    const filename = `${randomUUID()}${safeExt(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(this.dir, filename), buffer);
    return { url: `/uploads/${filename}` };
  }
}

// Prod on Vercel: filesystem is ephemeral/read-only, so local disk writes
// don't persist across invocations. Selected whenever BLOB_READ_WRITE_TOKEN
// is set (docs/04 §1).
class VercelBlobStorage implements FileStorage {
  async put(file: File): Promise<{ url: string }> {
    if (file.size > MAX_BYTES) throw new Error("File too large (max 8MB)");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`);

    const filename = `${randomUUID()}${safeExt(file.name)}`;
    const blob = await put(filename, file, {
      access: "public",
      token: config.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url };
  }
}

let storage: FileStorage | null = null;

export function getStorage(): FileStorage {
  if (!storage) {
    storage = config.BLOB_READ_WRITE_TOKEN ? new VercelBlobStorage() : new LocalDiskStorage();
  }
  return storage;
}
