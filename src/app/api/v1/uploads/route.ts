import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { errorResponse } from "@/lib/api";
import { getStorage } from "@/lib/storage";
import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";

// Any authenticated user may upload (asset photos, maintenance photos) —
// the resulting URL is only persisted once the owning entity's write
// endpoint (which IS permission-gated) accepts it.
export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError("No file provided");

    const { url } = await getStorage().put(file);
    return NextResponse.json({ data: { url } });
  } catch (err) {
    // storage.put throws plain Errors for size/type violations — surface
    // those as 400s instead of falling through to a generic 500.
    const mapped = err instanceof Error && !(err instanceof AppError) ? new ValidationError(err.message) : err;
    return errorResponse(mapped, requestId);
  }
}
