// Typed error hierarchy — services throw these, the API wrapper (lib/api.ts)
// maps them 1:1 to HTTP status codes. Never throw raw strings.

export type ErrorCode =
  | "VALIDATION_ERROR" // 400
  | "UNAUTHORIZED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "CONFLICT" // 409
  | "INVALID_TRANSITION" // 422
  | "INTERNAL"; // 500

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated") {
    super("UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do this") {
    super("FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super("NOT_FOUND", id ? `${entity} not found: ${id}` : `${entity} not found`);
  }
}

// details.transferable=true tells the UI to render the "Request Transfer"
// button on the double-allocation conflict (spec's Priya/Raj rule).
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFLICT", message, details);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(machine: string, from: string, to: string) {
    super("INVALID_TRANSITION", `Cannot move ${machine} from ${from} to ${to}`, {
      machine,
      from,
      to,
    });
  }
}

export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 422,
  INTERNAL: 500,
};
