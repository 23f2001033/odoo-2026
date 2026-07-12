import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { SessionUser } from "@/lib/authz";
import { SignupInput } from "./validators";

// Signup always creates an EMPLOYEE — role is not accepted from the client
// anywhere in this module. Promotion happens only in org.service (admin-gated).
export async function signup(input: SignupInput): Promise<SessionUser> {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "EMPLOYEE",
    },
  });

  await db.activityLog.create({
    data: {
      actorId: user.id,
      action: "user.signup",
      entityType: "User",
      entityId: user.id,
      meta: { email: user.email },
    },
  });

  return toSessionUser(user);
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser> {
  const user = await db.user.findUnique({ where: { email } });
  // Same error for unknown email and wrong password — no account enumeration.
  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError("Invalid email or password");
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password");
  }
  return toSessionUser(user);
}

function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: SessionUser["role"];
  departmentId: string | null;
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
  };
}
