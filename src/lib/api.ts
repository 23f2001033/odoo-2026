import { NextRequest, NextResponse } from "next/server";
import { ZodType, ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { AppError, HTTP_STATUS } from "./errors";
import { Permission, requirePermission, requireUser, SessionUser } from "./authz";

// Uniform envelope (docs/04 §7):
//   success → { data }
//   failure → { error: { code, message, details?, requestId } }
// Route handlers stay thin: parse → authorize → call service → respond.

type HandlerCtx<B> = {
  req: NextRequest;
  user: SessionUser;
  body: B;
  params: Record<string, string>;
};

type Options<B> = {
  permission?: Permission; // omit = any authenticated user
  body?: ZodType<B>; // zod schema for the JSON body
};

export function apiHandler<B = undefined>(
  options: Options<B>,
  handler: (ctx: HandlerCtx<B>) => Promise<unknown>
) {
  return async (
    req: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = crypto.randomUUID().slice(0, 8);
    try {
      const session = await auth();
      const sessionUser = (session?.user ?? null) as SessionUser | null;
      const user = options.permission
        ? requirePermission(sessionUser, options.permission)
        : requireUser(sessionUser);

      let body = undefined as B;
      if (options.body) {
        const json = await req.json().catch(() => ({}));
        body = options.body.parse(json);
      }

      const data = await handler({ req, user, body, params: await params });
      return NextResponse.json({ data });
    } catch (err) {
      return errorResponse(err, requestId);
    }
  };
}

export function errorResponse(err: unknown, requestId: string): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: { issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
          requestId,
        },
      },
      { status: 400 }
    );
  }

  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details, requestId } },
      { status: HTTP_STATUS[err.code] }
    );
  }

  // DB constraint races surface as Prisma errors — map the known ones so the
  // client gets the same shape whether the service pre-check or the DB caught it.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "This conflicts with an existing record", requestId } },
      { status: 409 }
    );
  }

  console.error(`[${requestId}] Unhandled error:`, err);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong", requestId } },
    { status: 500 }
  );
}
