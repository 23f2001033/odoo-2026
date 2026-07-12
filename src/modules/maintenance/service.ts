import { Prisma, MaintenanceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { SessionUser } from "@/lib/authz";
import { assertTransition, assetMachine, maintenanceMachine } from "@/lib/stateMachine";
import { createNotification } from "@/modules/notification/service";
import {
  MaintenanceAssignInput,
  MaintenanceCreateInput,
  MaintenanceRejectInput,
  MaintenanceResolveInput,
  MaintenanceSearchInput,
} from "./validators";

const MAINTENANCE_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  raisedBy: { select: { id: true, name: true, departmentId: true } },
  decidedBy: { select: { id: true, name: true } },
} satisfies Prisma.MaintenanceRequestInclude;

// A request is "in flight" from PENDING through IN_PROGRESS; REJECTED and
// RESOLVED are terminal. Only one in-flight request per asset is allowed —
// otherwise two people could raise duplicate tickets and the asset would
// flip Under Maintenance twice (docs/04 §6: "at most one non-terminal
// maintenance request per asset").
const NON_TERMINAL: MaintenanceStatus[] = ["PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS"];

export async function raiseMaintenance(actor: SessionUser, input: MaintenanceCreateInput) {
  const asset = await db.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) throw new NotFoundError("Asset", input.assetId);
  if (["RETIRED", "DISPOSED", "LOST"].includes(asset.status)) {
    throw new ConflictError(`Cannot raise maintenance for an asset that is ${asset.status.toLowerCase()}`);
  }

  const existing = await db.maintenanceRequest.findFirst({
    where: { assetId: input.assetId, status: { in: NON_TERMINAL } },
  });
  if (existing) throw new ConflictError("This asset already has an open maintenance request");

  return db.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.create({
      data: {
        assetId: input.assetId,
        raisedById: actor.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        photoUrl: input.photoUrl ?? null,
      },
      include: MAINTENANCE_INCLUDE,
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "maintenance.raised",
        entityType: "Asset",
        entityId: input.assetId,
        meta: { requestId: request.id, priority: input.priority },
      },
    });
    // Broadcast to every active Asset Manager — unlike allocations/transfers
    // there's no single prior actor to defer to for a brand-new ticket.
    const managers = await tx.user.findMany({
      where: { role: "ASSET_MANAGER", status: "ACTIVE" },
      select: { id: true },
    });
    for (const m of managers) {
      await createNotification(tx, {
        userId: m.id,
        type: "MAINTENANCE_REQUESTED",
        title: "Maintenance request awaiting review",
        body: `${actor.name} reported an issue with ${asset.name} (${asset.assetTag}): ${input.title}`,
        entityType: "Asset",
        entityId: input.assetId,
      });
    }
    return request;
  });
}

export async function approveMaintenance(actor: SessionUser, requestId: string) {
  const request = await db.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true },
  });
  if (!request) throw new NotFoundError("MaintenanceRequest", requestId);
  assertTransition(maintenanceMachine, request.status, "APPROVED");
  assertTransition(assetMachine, request.asset.status, "UNDER_MAINTENANCE");

  return db.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", decidedById: actor.id, decidedAt: new Date() },
      include: MAINTENANCE_INCLUDE,
    });
    await tx.asset.update({ where: { id: request.assetId }, data: { status: "UNDER_MAINTENANCE" } });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "maintenance.approved",
        entityType: "Asset",
        entityId: request.assetId,
        meta: { requestId },
      },
    });
    await createNotification(tx, {
      userId: request.raisedById,
      type: "MAINTENANCE_APPROVED",
      title: "Maintenance request approved",
      body: `${request.asset.name} (${request.asset.assetTag}) is now under maintenance.`,
      entityType: "Asset",
      entityId: request.assetId,
    });
    return updated;
  });
}

export async function rejectMaintenance(actor: SessionUser, requestId: string, input: MaintenanceRejectInput) {
  const request = await db.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true },
  });
  if (!request) throw new NotFoundError("MaintenanceRequest", requestId);
  assertTransition(maintenanceMachine, request.status, "REJECTED");

  return db.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        decidedById: actor.id,
        decidedAt: new Date(),
        rejectionReason: input.rejectionReason ?? null,
      },
      include: MAINTENANCE_INCLUDE,
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "maintenance.rejected",
        entityType: "Asset",
        entityId: request.assetId,
        meta: { requestId, rejectionReason: input.rejectionReason ?? null },
      },
    });
    await createNotification(tx, {
      userId: request.raisedById,
      type: "MAINTENANCE_REJECTED",
      title: "Maintenance request rejected",
      body: input.rejectionReason
        ? `Your request for ${request.asset.name} was rejected: ${input.rejectionReason}`
        : `Your request for ${request.asset.name} was rejected.`,
      entityType: "Asset",
      entityId: request.assetId,
    });
    return updated;
  });
}

export async function assignTechnician(actor: SessionUser, requestId: string, input: MaintenanceAssignInput) {
  const request = await db.maintenanceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError("MaintenanceRequest", requestId);
  assertTransition(maintenanceMachine, request.status, "ASSIGNED");

  return db.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: "ASSIGNED", technicianName: input.technicianName, assignedAt: new Date() },
      include: MAINTENANCE_INCLUDE,
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "maintenance.assigned",
        entityType: "Asset",
        entityId: request.assetId,
        meta: { requestId, technicianName: input.technicianName },
      },
    });
    return updated;
  });
}

export async function startMaintenance(actor: SessionUser, requestId: string) {
  const request = await db.maintenanceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError("MaintenanceRequest", requestId);
  assertTransition(maintenanceMachine, request.status, "IN_PROGRESS");

  return db.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
      include: MAINTENANCE_INCLUDE,
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "maintenance.started",
        entityType: "Asset",
        entityId: request.assetId,
        meta: { requestId },
      },
    });
    return updated;
  });
}

export async function resolveMaintenance(actor: SessionUser, requestId: string, input: MaintenanceResolveInput) {
  const request = await db.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true },
  });
  if (!request) throw new NotFoundError("MaintenanceRequest", requestId);
  assertTransition(maintenanceMachine, request.status, "RESOLVED");

  // Resolution returns the asset to whatever it was doing before repair: back
  // to its active holder if one exists, otherwise plain Available (docs/04
  // §6 — mirrors the same "don't over-generalize the target state" lesson
  // from the returnAllocation fix in milestone 3).
  const activeAllocation = await db.allocation.findFirst({
    where: { assetId: request.assetId, status: "ACTIVE" },
  });
  const nextAssetStatus = activeAllocation ? "ALLOCATED" : "AVAILABLE";
  assertTransition(assetMachine, request.asset.status, nextAssetStatus);

  return db.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNotes: input.resolutionNotes ?? null,
      },
      include: MAINTENANCE_INCLUDE,
    });
    await tx.asset.update({ where: { id: request.assetId }, data: { status: nextAssetStatus } });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "maintenance.resolved",
        entityType: "Asset",
        entityId: request.assetId,
        meta: { requestId, assetStatus: nextAssetStatus },
      },
    });
    return updated;
  });
}

export async function listMaintenanceRequests(actor: SessionUser, filters: MaintenanceSearchInput) {
  const where: Prisma.MaintenanceRequestWhereInput = {};

  if (filters.status === "ACTIVE") where.status = { in: NON_TERMINAL };
  else if (filters.status) where.status = filters.status as MaintenanceStatus;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assetId) where.assetId = filters.assetId;

  if (actor.role === "EMPLOYEE") {
    where.OR = [
      { raisedById: actor.id },
      { asset: { allocations: { some: { status: "ACTIVE", holderUserId: actor.id } } } },
    ];
  } else if (actor.role === "DEPT_HEAD") {
    where.OR = [
      { raisedById: actor.id },
      {
        asset: {
          allocations: {
            some: {
              status: "ACTIVE",
              OR: [{ holderDeptId: actor.departmentId }, { holderUser: { departmentId: actor.departmentId } }],
            },
          },
        },
      },
    ];
  }
  // ASSET_MANAGER / ADMIN see everything.

  return db.maintenanceRequest.findMany({
    where,
    include: MAINTENANCE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}
