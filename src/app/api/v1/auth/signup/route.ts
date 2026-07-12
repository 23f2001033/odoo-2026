import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { signupSchema } from "@/modules/auth/validators";
import { signup } from "@/modules/auth/service";

// Public endpoint (not wrapped in apiHandler, which requires a session).
// Creates an EMPLOYEE account only — see modules/auth/service.ts.
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const body = signupSchema.parse(await req.json().catch(() => ({})));
    const user = await signup(body);
    return NextResponse.json({ data: { id: user.id, email: user.email } }, { status: 201 });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
