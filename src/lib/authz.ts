import { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "./errors";

// Single source of truth for RBAC — mirrors the role table in
// docs/01-problem-statement.md. UI hides what you can't do; this enforces it.

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
};

export const PERMISSIONS = {
  // Admin: org master data, roles, audit cycles, org-wide analytics
  "org.manage": ["ADMIN"],
  "role.assign": ["ADMIN"],
  "audit.cycle.manage": ["ADMIN"],
  "report.orgWide": ["ADMIN"],

  // Asset Manager
  "asset.register": ["ASSET_MANAGER", "ADMIN"],
  "asset.update": ["ASSET_MANAGER", "ADMIN"],
  "asset.allocate": ["ASSET_MANAGER"],
  "return.approve": ["ASSET_MANAGER"],
  "maintenance.approve": ["ASSET_MANAGER"],
  "maintenance.progress": ["ASSET_MANAGER"], // assign/start/resolve
  "transfer.approve": ["ASSET_MANAGER", "DEPT_HEAD"], // dept head: own dept only (scope check)

  // Everyone authenticated
  "booking.create": ["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER", "ADMIN"],
  "maintenance.raise": ["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER", "ADMIN"],
  "transfer.request": ["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER", "ADMIN"],
  "return.request": ["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER", "ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(user: { role: Role }, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(user.role);
}

export function requireUser(user: SessionUser | null | undefined): SessionUser {
  if (!user) throw new UnauthorizedError();
  return user;
}

export function requirePermission(
  user: SessionUser | null | undefined,
  permission: Permission
): SessionUser {
  const u = requireUser(user);
  if (!hasPermission(u, permission)) {
    throw new ForbiddenError(`Requires permission: ${permission}`);
  }
  return u;
}

// Scoped check for dept-head approvals: managers approve anything, dept heads
// only within their own department. (Auditor is a capability, not a role —
// checked against AuditAssignment rows by the audit service.)
export function canApproveForDepartment(user: SessionUser, deptId: string | null): boolean {
  if (user.role === "ASSET_MANAGER") return true;
  if (user.role === "DEPT_HEAD") return !!deptId && user.departmentId === deptId;
  return false;
}
