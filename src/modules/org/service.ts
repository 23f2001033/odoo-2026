import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { SessionUser } from "@/lib/authz";
import {
  CategoryCreateInput,
  CategoryUpdateInput,
  DepartmentCreateInput,
  DepartmentUpdateInput,
  EmployeeUpdateInput,
  RoleAssignInput,
} from "./validators";

// ─────────────────────────── departments ───────────────────────────

export function listDepartments() {
  return db.department.findMany({
    orderBy: { name: "asc" },
    include: {
      head: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });
}

export async function createDepartment(actor: SessionUser, input: DepartmentCreateInput) {
  await assertValidHead(input.headId);
  return db.$transaction(async (tx) => {
    const dept = await tx.department
      .create({
        data: { name: input.name, headId: input.headId ?? null, parentId: input.parentId ?? null },
      })
      .catch(rethrowUnique("A department with this name already exists"));
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "department.created",
        entityType: "Department",
        entityId: dept.id,
        meta: { name: dept.name },
      },
    });
    return dept;
  });
}

export async function updateDepartment(
  actor: SessionUser,
  id: string,
  input: DepartmentUpdateInput
) {
  const dept = await db.department.findUnique({ where: { id } });
  if (!dept) throw new NotFoundError("Department", id);

  if (input.parentId) {
    if (input.parentId === id) throw new ValidationError("A department cannot be its own parent");
    await assertNoHierarchyCycle(id, input.parentId);
  }
  if (input.headId !== undefined) await assertValidHead(input.headId);

  return db.$transaction(async (tx) => {
    const updated = await tx.department
      .update({ where: { id }, data: input })
      .catch(rethrowUnique("A department with this name already exists"));
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "department.updated",
        entityType: "Department",
        entityId: id,
        meta: { changes: input as object },
      },
    });
    return updated;
  });
}

async function assertValidHead(headId: string | null | undefined) {
  if (!headId) return;
  const head = await db.user.findUnique({ where: { id: headId } });
  if (!head || head.status !== "ACTIVE") {
    throw new ValidationError("Selected department head is not an active user");
  }
}

// Walk the proposed parent's ancestor chain — if we meet the department
// being edited, the change would create a cycle in the hierarchy.
async function assertNoHierarchyCycle(deptId: string, newParentId: string) {
  let current: string | null = newParentId;
  let hops = 0;
  while (current && hops < 50) {
    if (current === deptId) {
      throw new ValidationError("This parent would create a cycle in the department hierarchy");
    }
    const parent: { parentId: string | null } | null = await db.department.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = parent?.parentId ?? null;
    hops++;
  }
}

// ─────────────────────────── categories ───────────────────────────

export function listCategories() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assets: true } } },
  });
}

export async function createCategory(actor: SessionUser, input: CategoryCreateInput) {
  assertUniqueFieldKeys(input.fieldDefs);
  return db.$transaction(async (tx) => {
    const category = await tx.category
      .create({
        data: {
          name: input.name,
          description: input.description ?? null,
          fieldDefs: input.fieldDefs,
        },
      })
      .catch(rethrowUnique("A category with this name already exists"));
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "category.created",
        entityType: "Category",
        entityId: category.id,
        meta: { name: category.name },
      },
    });
    return category;
  });
}

export async function updateCategory(actor: SessionUser, id: string, input: CategoryUpdateInput) {
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Category", id);
  if (input.fieldDefs) assertUniqueFieldKeys(input.fieldDefs);

  return db.$transaction(async (tx) => {
    const category = await tx.category
      .update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          fieldDefs: input.fieldDefs,
        },
      })
      .catch(rethrowUnique("A category with this name already exists"));
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "category.updated",
        entityType: "Category",
        entityId: id,
        meta: { changes: input as object },
      },
    });
    return category;
  });
}

function assertUniqueFieldKeys(defs: { key: string }[] | undefined) {
  if (!defs) return;
  const keys = defs.map((d) => d.key);
  if (new Set(keys).size !== keys.length) {
    throw new ValidationError("Custom field keys must be unique");
  }
}

// ─────────────────────────── employee directory ───────────────────────────

// Public-safe user projection — passwordHash must never cross the API boundary.
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
} as const;

export function listEmployees() {
  return db.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      department: { select: { id: true, name: true } },
    },
  });
}

// THE only code path that changes a role (spec: roles are assigned solely by
// Admin from the Employee Directory — signup hard-codes EMPLOYEE).
export async function assignRole(actor: SessionUser, userId: string, input: RoleAssignInput) {
  if (actor.id === userId) {
    throw new ValidationError("You cannot change your own role"); // avoids locking out the last admin
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { ...SAFE_USER_SELECT, name: true } });
  if (!user) throw new NotFoundError("User", userId);
  if (user.role === input.role) return user;

  return db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { role: input.role },
      select: SAFE_USER_SELECT, // never let passwordHash leave the service
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "user.role_assigned",
        entityType: "User",
        entityId: userId,
        meta: { from: user.role, to: input.role },
      },
    });
    await tx.notification.create({
      data: {
        userId,
        type: "ASSET_ASSIGNED", // closest generic type until notification module lands (M7)
        title: "Your role was updated",
        body: `${actor.name} changed your role from ${user.role} to ${input.role}.`,
        entityType: "User",
        entityId: userId,
      },
    });
    return updated;
  });
}

export async function updateEmployee(actor: SessionUser, userId: string, input: EmployeeUpdateInput) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User", userId);
  if (input.status === "INACTIVE" && actor.id === userId) {
    throw new ValidationError("You cannot deactivate your own account");
  }
  if (input.departmentId) {
    const dept = await db.department.findUnique({ where: { id: input.departmentId } });
    if (!dept || dept.status !== "ACTIVE") {
      throw new ValidationError("Selected department is not active");
    }
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { departmentId: input.departmentId, status: input.status },
      select: SAFE_USER_SELECT,
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "user.updated",
        entityType: "User",
        entityId: userId,
        meta: { changes: input as object },
      },
    });
    return updated;
  });
}

// Map Prisma's unique-violation (P2002) to our typed ConflictError so the API
// envelope carries a friendly message instead of a raw DB error.
function rethrowUnique(message: string) {
  return (err: unknown): never => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(message);
    }
    throw err;
  };
}
