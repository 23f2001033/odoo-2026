import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { canApproveForDepartment, SessionUser } from "@/lib/authz";
import { assertTransition, assetMachine, isOverdue, transferMachine } from "@/lib/stateMachine";
import { createNotification } from "@/modules/notification/service";
import {
  AllocationCreateInput,
  AllocationSearchInput,
  ReturnInput,
  TransferApproveInput,
  TransferRejectInput,
  TransferRequestInput,
} from "./validators";

const HOLDER_INCLUDE = {
  holderUser: { select: { id: true, name: true, departmentId: true } },
  holderDept: { select: { id: true, name: true } },
  allocatedBy: { select: { id: true, name: true } },
} satisfies Prisma.AllocationInclude;

function holderLabel(a: { holderUser: { name: string } | null; holderDept: { name: string } | null }) {
  return a.holderUser?.name ?? a.holderDept?.name ?? "another holder";
}

// Notification.userId is required — a department-held allocation has no
// individual to notify unless we resolve it to the department's head.
// Silently no-ops if the department has no head assigned yet.
async function notifyHolder(
  tx: Prisma.TransactionClient,
  target: { holderUserId?: string | null; holderDeptId?: string | null },
  payload: { type: Parameters<typeof createNotification>[1]["type"]; title: string; body: string; entityType: string; entityId: string }
) {
  if (target.holderUserId) {
    await createNotification(tx, { ...payload, userId: target.holderUserId });
    return;
  }
  if (target.holderDeptId) {
    const dept = await tx.department.findUnique({ where: { id: target.holderDeptId }, select: { headId: true } });
    if (dept?.headId) await createNotification(tx, { ...payload, userId: dept.headId });
  }
}

// ─────────────────────────── allocate ───────────────────────────
//
// The spec's signature rule: allocating an already-held asset must NOT
// succeed silently or generically fail — it must name the current holder
// and offer a Transfer Request instead (docs/01, "Priya/Raj" example).
// That contract is enforced twice: a pre-check for the common case (fast,
// friendly error with full holder detail) and a DB-level partial unique
// index (docs/04 §5.1) that catches the race if two requests land at once
// — the P2002 catch below re-derives the same friendly shape either way.
export async function allocateAsset(actor: SessionUser, input: AllocationCreateInput) {
  const asset = await db.asset.findUnique({
    where: { id: input.assetId },
    include: { allocations: { where: { status: "ACTIVE" }, include: HOLDER_INCLUDE, take: 1 } },
  });
  if (!asset) throw new NotFoundError("Asset", input.assetId);

  const existing = asset.allocations[0];
  if (existing) throw conflictFor(existing);

  assertTransition(assetMachine, asset.status, "ALLOCATED");
  await assertValidHolder(input);

  try {
    return await db.$transaction(async (tx) => {
      const allocation = await tx.allocation.create({
        data: {
          assetId: input.assetId,
          holderUserId: input.holderUserId ?? null,
          holderDeptId: input.holderDeptId ?? null,
          allocatedById: actor.id,
          expectedReturnAt: input.expectedReturnAt ?? null,
        },
        include: HOLDER_INCLUDE,
      });
      await tx.asset.update({ where: { id: input.assetId }, data: { status: "ALLOCATED" } });
      await tx.activityLog.create({
        data: {
          actorId: actor.id,
          action: "allocation.created",
          entityType: "Asset",
          entityId: input.assetId,
          meta: { allocationId: allocation.id, holder: holderLabel(allocation) },
        },
      });
      await notifyHolder(tx, input, {
        type: "ASSET_ASSIGNED",
        title: "Asset assigned",
        body: `${asset.name} (${asset.assetTag}) has been allocated.`,
        entityType: "Asset",
        entityId: input.assetId,
      });
      return allocation;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Lost the race — someone else's allocation landed first between our
      // pre-check and this insert. Re-fetch to give the same friendly error.
      const winner = await db.allocation.findFirst({
        where: { assetId: input.assetId, status: "ACTIVE" },
        include: HOLDER_INCLUDE,
      });
      if (winner) throw conflictFor(winner);
    }
    throw err;
  }
}

function conflictFor(allocation: {
  id: string;
  holderUser: { name: string } | null;
  holderDept: { name: string } | null;
}) {
  return new ConflictError(`This asset is currently held by ${holderLabel(allocation)}`, {
    transferable: true,
    allocationId: allocation.id,
    holderName: holderLabel(allocation),
  });
}

async function assertValidHolder(input: AllocationCreateInput) {
  if (input.holderUserId) {
    const user = await db.user.findUnique({ where: { id: input.holderUserId } });
    if (!user || user.status !== "ACTIVE") throw new ValidationError("Selected employee is not active");
  } else if (input.holderDeptId) {
    const dept = await db.department.findUnique({ where: { id: input.holderDeptId } });
    if (!dept || dept.status !== "ACTIVE") throw new ValidationError("Selected department is not active");
  }
}

// ─────────────────────────── return ───────────────────────────

// Finalizing a return (condition check-in) is an Asset Manager action per
// the role table; the holder can only *request* one (see requestReturn).
export async function returnAllocation(actor: SessionUser, allocationId: string, input: ReturnInput) {
  const allocation = await db.allocation.findUnique({
    where: { id: allocationId },
    include: { asset: true, ...HOLDER_INCLUDE },
  });
  if (!allocation) throw new NotFoundError("Allocation", allocationId);
  if (allocation.status !== "ACTIVE") throw new ConflictError("This allocation is not active");
  // Explicit precondition, not just assertTransition(status, "AVAILABLE"):
  // several asset states legally reach Available (e.g. UNDER_MAINTENANCE →
  // Available once maintenance lands in M5), but "return" is only meaningful
  // from Allocated specifically — an asset sent for repair mid-allocation
  // must resolve through the maintenance flow, not this one.
  if (allocation.asset.status !== "ALLOCATED") {
    throw new ConflictError(`Cannot process a return while the asset is ${allocation.asset.status}`);
  }
  assertTransition(assetMachine, allocation.asset.status, "AVAILABLE");

  return db.$transaction(async (tx) => {
    const updated = await tx.allocation.update({
      where: { id: allocationId },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        returnCondition: input.returnCondition,
        returnNotes: input.returnNotes ?? null,
      },
    });
    await tx.asset.update({ where: { id: allocation.assetId }, data: { status: "AVAILABLE" } });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "allocation.returned",
        entityType: "Asset",
        entityId: allocation.assetId,
        meta: { allocationId, condition: input.returnCondition },
      },
    });
    await notifyHolder(tx, allocation, {
      type: "RETURN_CONFIRMED",
      title: "Return confirmed",
      body: `${allocation.asset.name} (${allocation.asset.assetTag}) has been marked as returned.`,
      entityType: "Asset",
      entityId: allocation.assetId,
    });
    return updated;
  });
}

// Self-service: the current holder flags that they'd like to return the
// item. This doesn't change any status — it notifies the manager who
// allocated it, who then finalizes with returnAllocation() above. Avoids
// inventing an unspecified multi-state "return request" workflow while
// still giving employees the "initiates return" agency the role table lists.
export async function requestReturn(actor: SessionUser, allocationId: string) {
  const allocation = await db.allocation.findUnique({
    where: { id: allocationId },
    include: { asset: true, allocatedBy: { select: { id: true, name: true } } },
  });
  if (!allocation) throw new NotFoundError("Allocation", allocationId);
  if (allocation.status !== "ACTIVE") throw new ConflictError("This allocation is not active");
  if (allocation.holderUserId !== actor.id) {
    throw new ValidationError("Only the current holder can request a return for this asset");
  }

  return db.$transaction(async (tx) => {
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "allocation.return_requested",
        entityType: "Asset",
        entityId: allocation.assetId,
        meta: { allocationId },
      },
    });
    await createNotification(tx, {
      userId: allocation.allocatedById,
      type: "RETURN_REQUESTED",
      title: "Return requested",
      body: `${actor.name} wants to return ${allocation.asset.name} (${allocation.asset.assetTag}).`,
      entityType: "Asset",
      entityId: allocation.assetId,
    });
    return { ok: true };
  });
}

// ─────────────────────────── reads ───────────────────────────

// Role-scoped per the spec's role table: Asset Manager/Admin see everything,
// Department Head sees their department's allocations, Employee sees only
// their own.
export async function listAllocations(actor: SessionUser, filters: AllocationSearchInput) {
  const where: Prisma.AllocationWhereInput = {};

  if (filters.status === "ACTIVE") where.status = "ACTIVE";
  else if (filters.status === "RETURNED") where.status = "RETURNED";
  else if (filters.status === "OVERDUE") {
    where.status = "ACTIVE";
    where.expectedReturnAt = { lt: new Date() };
  }
  if (filters.assetId) where.assetId = filters.assetId;

  if (actor.role === "EMPLOYEE") {
    where.holderUserId = actor.id;
  } else if (actor.role === "DEPT_HEAD") {
    where.OR = [{ holderDeptId: actor.departmentId }, { holderUser: { departmentId: actor.departmentId } }];
  }
  // ASSET_MANAGER / ADMIN see all — no additional scope.

  const [items, total] = await Promise.all([
    db.allocation.findMany({
      where,
      include: {
        asset: { select: { id: true, assetTag: true, name: true, status: true } },
        ...HOLDER_INCLUDE,
      },
      orderBy: { allocatedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.allocation.count({ where }),
  ]);

  return {
    items: items.map((a) => ({ ...a, overdue: isOverdue(a) })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

// ═══════════════════════════ transfers ═══════════════════════════
//
// Transfer and allocation share one module: approving a transfer directly
// manipulates Allocation rows inside a single transaction (close old, open
// new), which only works cleanly with shared transactional scope — splitting
// this into a separate module would force an awkward cross-module tx handoff
// (docs/04 §2 forbids modules reaching into each other's repositories).

const TRANSFER_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  targetUser: { select: { id: true, name: true, departmentId: true } },
  targetDept: { select: { id: true, name: true } },
  decidedBy: { select: { id: true, name: true } },
  asset: { select: { id: true, assetTag: true, name: true } },
} satisfies Prisma.TransferRequestInclude;

export async function requestTransfer(actor: SessionUser, input: TransferRequestInput) {
  const allocation = await db.allocation.findUnique({
    where: { id: input.allocationId },
    include: { asset: true, ...HOLDER_INCLUDE },
  });
  if (!allocation) throw new NotFoundError("Allocation", input.allocationId);
  if (allocation.status !== "ACTIVE") throw new ConflictError("This asset is not currently allocated");

  // Employees may only request an asset for themselves — general reassignment
  // between two other people is an Asset Manager / Dept Head responsibility
  // (role table: Employee "initiates" requests, doesn't reassign at large).
  if (actor.role === "EMPLOYEE" && input.targetUserId !== actor.id) {
    throw new ForbiddenError("You can only request a transfer to yourself");
  }
  // Requesting a transfer to the asset's current holder is a no-op.
  if (
    (input.targetUserId && input.targetUserId === allocation.holderUserId) ||
    (input.targetDeptId && input.targetDeptId === allocation.holderDeptId)
  ) {
    throw new ValidationError("This asset is already held by the selected target");
  }

  const pending = await db.transferRequest.findFirst({
    where: { allocationId: input.allocationId, status: "REQUESTED" },
  });
  if (pending) throw new ConflictError("A transfer request is already pending for this asset");

  await assertValidTarget(input);

  return db.$transaction(async (tx) => {
    const transfer = await tx.transferRequest.create({
      data: {
        allocationId: input.allocationId,
        assetId: allocation.assetId,
        requestedById: actor.id,
        targetUserId: input.targetUserId ?? null,
        targetDeptId: input.targetDeptId ?? null,
        reason: input.reason ?? null,
      },
      include: TRANSFER_INCLUDE,
    });

    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "transfer.requested",
        entityType: "Asset",
        entityId: allocation.assetId,
        meta: { transferId: transfer.id, targetLabel: holderLabel({ holderUser: transfer.targetUser, holderDept: transfer.targetDept }) },
      },
    });

    // Notify the current holder (their asset is being requested) and the
    // manager who allocated it (the natural first approver) — skipping
    // self-notification if the requester happens to be either of them.
    if (allocation.holderUserId && allocation.holderUserId !== actor.id) {
      await createNotification(tx, {
        userId: allocation.holderUserId,
        type: "TRANSFER_REQUESTED",
        title: "Transfer requested for your asset",
        body: `${actor.name} requested a transfer of ${allocation.asset.name} (${allocation.asset.assetTag}).`,
        entityType: "Asset",
        entityId: allocation.assetId,
      });
    }
    if (allocation.allocatedById !== actor.id) {
      await createNotification(tx, {
        userId: allocation.allocatedById,
        type: "TRANSFER_REQUESTED",
        title: "Transfer request awaiting review",
        body: `${actor.name} requested to take ${allocation.asset.name} (${allocation.asset.assetTag}).`,
        entityType: "Asset",
        entityId: allocation.assetId,
      });
    }

    return transfer;
  });
}

async function assertValidTarget(input: { targetUserId?: string | null; targetDeptId?: string | null }) {
  if (input.targetUserId) {
    const user = await db.user.findUnique({ where: { id: input.targetUserId } });
    if (!user || user.status !== "ACTIVE") throw new ValidationError("Selected employee is not active");
  } else if (input.targetDeptId) {
    const dept = await db.department.findUnique({ where: { id: input.targetDeptId } });
    if (!dept || dept.status !== "ACTIVE") throw new ValidationError("Selected department is not active");
  }
}

async function loadTransferForDecision(transferId: string) {
  const transfer = await db.transferRequest.findUnique({
    where: { id: transferId },
    include: {
      allocation: { include: { asset: true, ...HOLDER_INCLUDE } },
      targetUser: { select: { id: true, name: true, departmentId: true } },
      targetDept: { select: { id: true, name: true } },
    },
  });
  if (!transfer) throw new NotFoundError("TransferRequest", transferId);
  return transfer;
}

// Dept heads may decide transfers touching their own department, on either
// side (losing the asset or receiving it); asset managers decide anything.
function assertCanDecideTransfer(
  actor: SessionUser,
  transfer: Awaited<ReturnType<typeof loadTransferForDecision>>
) {
  const sourceDeptId = transfer.allocation.holderDeptId ?? transfer.allocation.holderUser?.departmentId ?? null;
  const targetDeptId = transfer.targetDeptId ?? transfer.targetUser?.departmentId ?? null;
  if (!canApproveForDepartment(actor, sourceDeptId) && !canApproveForDepartment(actor, targetDeptId)) {
    throw new ForbiddenError("You can only decide transfers within your department");
  }
}

export async function approveTransfer(
  actor: SessionUser,
  transferId: string,
  input: TransferApproveInput
) {
  const transfer = await loadTransferForDecision(transferId);
  assertTransition(transferMachine, transfer.status, "APPROVED");
  assertCanDecideTransfer(actor, transfer);
  if (transfer.allocation.status !== "ACTIVE") {
    throw new ConflictError("The underlying allocation is no longer active");
  }
  // Proves the atomic REQUESTED→APPROVED→COMPLETED cascade (docs/04 §6) is a
  // legal machine path before we persist straight to the terminal status.
  assertTransition(transferMachine, "APPROVED", "COMPLETED");

  try {
    return await db.$transaction(async (tx) => {
      // Guarded claim: if a concurrent approve/reject already decided this
      // transfer (both requests can pass the pre-checks above before either
      // commits), updateMany affects zero rows and we bail with a friendly
      // error instead of silently double-processing it.
      const claim = await tx.transferRequest.updateMany({
        where: { id: transferId, status: "REQUESTED" },
        data: { status: "COMPLETED", decidedById: actor.id, decidedAt: new Date() },
      });
      if (claim.count === 0) {
        throw new ConflictError("This transfer request was already decided");
      }

      await tx.allocation.update({
        where: { id: transfer.allocationId },
        data: { status: "RETURNED", returnedAt: new Date() },
      });
      const newAllocation = await tx.allocation.create({
        data: {
          assetId: transfer.assetId,
          holderUserId: transfer.targetUserId,
          holderDeptId: transfer.targetDeptId,
          allocatedById: actor.id,
          expectedReturnAt: input.expectedReturnAt ?? null,
        },
      });
      const updated = await tx.transferRequest.findUniqueOrThrow({
        where: { id: transferId },
        include: TRANSFER_INCLUDE,
      });
      await tx.activityLog.create({
        data: {
          actorId: actor.id,
          action: "transfer.approved",
          entityType: "Asset",
          entityId: transfer.assetId,
          meta: { transferId, newAllocationId: newAllocation.id },
        },
      });

      await notifyHolder(
        tx,
        { holderUserId: transfer.targetUserId, holderDeptId: transfer.targetDeptId },
        {
          type: "ASSET_ASSIGNED",
          title: "Asset assigned",
          body: `${transfer.allocation.asset.name} (${transfer.allocation.asset.assetTag}) has been transferred to you.`,
          entityType: "Asset",
          entityId: transfer.assetId,
        }
      );
      await notifyHolder(tx, transfer.allocation, {
        type: "TRANSFER_APPROVED",
        title: "Transfer approved",
        body: `${transfer.allocation.asset.name} (${transfer.allocation.asset.assetTag}) has been transferred away from you.`,
        entityType: "Asset",
        entityId: transfer.assetId,
      });
      if (transfer.requestedById !== actor.id && transfer.requestedById !== transfer.targetUserId) {
        await createNotification(tx, {
          userId: transfer.requestedById,
          type: "TRANSFER_APPROVED",
          title: "Your transfer request was approved",
          body: `The transfer of ${transfer.allocation.asset.name} (${transfer.allocation.asset.assetTag}) was approved.`,
          entityType: "Asset",
          entityId: transfer.assetId,
        });
      }

      return updated;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("This asset was just allocated through another request");
    }
    throw err;
  }
}

export async function rejectTransfer(actor: SessionUser, transferId: string, input: TransferRejectInput) {
  const transfer = await loadTransferForDecision(transferId);
  assertTransition(transferMachine, transfer.status, "REJECTED");
  assertCanDecideTransfer(actor, transfer);

  return db.$transaction(async (tx) => {
    const claim = await tx.transferRequest.updateMany({
      where: { id: transferId, status: "REQUESTED" },
      data: {
        status: "REJECTED",
        decidedById: actor.id,
        decidedAt: new Date(),
        decisionNote: input.decisionNote ?? null,
      },
    });
    if (claim.count === 0) {
      throw new ConflictError("This transfer request was already decided");
    }
    const updated = await tx.transferRequest.findUniqueOrThrow({
      where: { id: transferId },
      include: TRANSFER_INCLUDE,
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "transfer.rejected",
        entityType: "Asset",
        entityId: transfer.assetId,
        meta: { transferId, decisionNote: input.decisionNote ?? null },
      },
    });
    await createNotification(tx, {
      userId: transfer.requestedById,
      type: "TRANSFER_REJECTED",
      title: "Transfer request rejected",
      body: input.decisionNote
        ? `Your request for ${transfer.allocation.asset.name} was rejected: ${input.decisionNote}`
        : `Your request for ${transfer.allocation.asset.name} was rejected.`,
      entityType: "Asset",
      entityId: transfer.assetId,
    });
    return updated;
  });
}

// Role-scoped: employees see requests they raised plus ones targeting assets
// they currently hold; dept heads additionally see anything touching their
// department on either side; managers/admins see everything.
export async function listTransferRequests(actor: SessionUser) {
  const where: Prisma.TransferRequestWhereInput = {};

  if (actor.role === "EMPLOYEE") {
    where.OR = [{ requestedById: actor.id }, { allocation: { holderUserId: actor.id } }];
  } else if (actor.role === "DEPT_HEAD") {
    where.OR = [
      { requestedById: actor.id },
      { targetDeptId: actor.departmentId },
      { targetUser: { departmentId: actor.departmentId } },
      { allocation: { holderDeptId: actor.departmentId } },
      { allocation: { holderUser: { departmentId: actor.departmentId } } },
    ];
  }

  return db.transferRequest.findMany({
    where,
    include: TRANSFER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}
