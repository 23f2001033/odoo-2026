import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { SessionUser } from "@/lib/authz";
import { assertTransition, auditCycleMachine, canTransition, assetMachine } from "@/lib/stateMachine";
import { createNotification } from "@/modules/notification/service";
import { autoRaiseMaintenanceFromAudit } from "@/modules/maintenance/service";
import { AuditCycleCreateInput, AuditItemCheckInput } from "./validators";

const CYCLE_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  scopeDept: { select: { id: true, name: true } },
  assignments: { include: { auditor: { select: { id: true, name: true } } } },
  _count: { select: { items: true } },
} satisfies Prisma.AuditCycleInclude;

// Resolves which assets fall under a cycle's scope at creation time — items
// are snapshotted once, not recomputed live (docs/04 §3): the audit is a
// point-in-time inventory check, not a moving target. Retired/disposed
// assets are excluded (nothing to verify); Lost assets ARE included, since
// re-confirming a "lost" item is still missing (or was found) is valuable.
async function resolveInScopeAssetIds(scopeDeptId: string | null, scopeLocation: string | null): Promise<string[]> {
  const where: Prisma.AssetWhereInput = { status: { notIn: ["RETIRED", "DISPOSED"] } };
  if (scopeDeptId) {
    where.allocations = {
      some: {
        status: "ACTIVE",
        OR: [{ holderDeptId: scopeDeptId }, { holderUser: { departmentId: scopeDeptId } }],
      },
    };
  } else if (scopeLocation) {
    where.location = { contains: scopeLocation, mode: "insensitive" };
  }
  const assets = await db.asset.findMany({ where, select: { id: true } });
  return assets.map((a) => a.id);
}

export async function createAuditCycle(actor: SessionUser, input: AuditCycleCreateInput) {
  if (input.scopeDeptId) {
    const dept = await db.department.findUnique({ where: { id: input.scopeDeptId } });
    if (!dept || dept.status !== "ACTIVE") throw new ValidationError("Selected department is not active");
  }
  const auditors = await db.user.findMany({
    where: { id: { in: input.auditorUserIds }, status: "ACTIVE" },
    select: { id: true },
  });
  if (auditors.length !== input.auditorUserIds.length) {
    throw new ValidationError("One or more selected auditors are not active users");
  }

  const assetIds = await resolveInScopeAssetIds(input.scopeDeptId ?? null, input.scopeLocation ?? null);
  if (assetIds.length === 0) {
    throw new ValidationError("No assets match this audit scope");
  }

  return db.$transaction(async (tx) => {
    const cycle = await tx.auditCycle.create({
      data: {
        name: input.name,
        scopeDeptId: input.scopeDeptId ?? null,
        scopeLocation: input.scopeLocation ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        createdById: actor.id,
      },
    });
    await tx.auditAssignment.createMany({
      data: input.auditorUserIds.map((auditorUserId) => ({ cycleId: cycle.id, auditorUserId })),
    });
    await tx.auditItem.createMany({
      data: assetIds.map((assetId) => ({ cycleId: cycle.id, assetId })),
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "audit.cycle_created",
        entityType: "AuditCycle",
        entityId: cycle.id,
        meta: { name: cycle.name, assetCount: assetIds.length, auditorCount: input.auditorUserIds.length },
      },
    });
    // Re-fetch with the include: the object captured right after .create()
    // predates the assignments/items just inserted above, so returning it
    // directly would show assignments:[] and _count.items:0 even though
    // both were just written in this same transaction.
    return tx.auditCycle.findUniqueOrThrow({ where: { id: cycle.id }, include: CYCLE_INCLUDE });
  });
}

async function assertIsAuditorOrAdmin(actor: SessionUser, cycleId: string) {
  if (actor.role === "ADMIN") return;
  const assignment = await db.auditAssignment.findUnique({
    where: { cycleId_auditorUserId: { cycleId, auditorUserId: actor.id } },
  });
  if (!assignment) throw new ForbiddenError("You are not assigned as an auditor for this cycle");
}

export async function checkAuditItem(
  actor: SessionUser,
  cycleId: string,
  itemId: string,
  input: AuditItemCheckInput
) {
  const cycle = await db.auditCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new NotFoundError("AuditCycle", cycleId);
  if (cycle.status !== "OPEN") throw new ConflictError("This audit cycle is closed");
  await assertIsAuditorOrAdmin(actor, cycleId);

  const item = await db.auditItem.findUnique({ where: { id: itemId } });
  if (!item || item.cycleId !== cycleId) throw new NotFoundError("AuditItem", itemId);

  return db.$transaction(async (tx) => {
    const updated = await tx.auditItem.update({
      where: { id: itemId },
      data: { result: input.result, notes: input.notes ?? null, checkedById: actor.id, checkedAt: new Date() },
      include: {
        asset: { select: { id: true, assetTag: true, name: true, status: true } },
        checkedBy: { select: { id: true, name: true } },
      },
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "audit.item_checked",
        entityType: "Asset",
        entityId: item.assetId,
        meta: { cycleId, itemId, result: input.result },
      },
    });
    return updated;
  });
}

// Closing locks the cycle and cascades consequences (docs/04 §6):
// MISSING -> asset Lost, DAMAGED -> auto-raised maintenance ticket. Uses
// canTransition (not the throwing assertTransition) per item, because an
// asset's status can legitimately drift during the audit window (someone
// retires or returns it mid-cycle) — one stale item shouldn't be able to
// abort closing the whole cycle.
export async function closeAuditCycle(actor: SessionUser, cycleId: string) {
  const cycle = await db.auditCycle.findUnique({
    where: { id: cycleId },
    include: { items: { include: { asset: true } } },
  });
  if (!cycle) throw new NotFoundError("AuditCycle", cycleId);
  assertTransition(auditCycleMachine, cycle.status, "CLOSED");

  const missing = cycle.items.filter((i) => i.result === "MISSING");
  const damaged = cycle.items.filter((i) => i.result === "DAMAGED");
  const unchecked = cycle.items.filter((i) => i.result === "PENDING").length;

  return db.$transaction(async (tx) => {
    await tx.auditCycle.update({ where: { id: cycleId }, data: { status: "CLOSED", closedAt: new Date() } });

    const lostApplied: string[] = [];
    const lostSkipped: string[] = [];
    for (const item of missing) {
      if (item.asset.status === "LOST") continue; // already Lost, nothing to do
      if (canTransition(assetMachine, item.asset.status, "LOST")) {
        await tx.asset.update({ where: { id: item.assetId }, data: { status: "LOST" } });
        lostApplied.push(item.assetId);
      } else {
        lostSkipped.push(item.assetId); // e.g. retired/disposed mid-cycle
      }
    }

    for (const item of damaged) {
      await autoRaiseMaintenanceFromAudit(tx, {
        assetId: item.assetId,
        raisedById: actor.id,
        title: `Damage confirmed during audit: ${cycle.name}`,
        description: item.notes?.trim() || "Flagged as damaged during a scheduled audit cycle.",
      });
    }

    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "audit.cycle_closed",
        entityType: "AuditCycle",
        entityId: cycleId,
        meta: {
          missingCount: missing.length,
          damagedCount: damaged.length,
          uncheckedCount: unchecked,
          lostApplied: lostApplied.length,
          lostSkipped: lostSkipped.length,
        },
      },
    });

    if (missing.length + damaged.length > 0) {
      const managers = await tx.user.findMany({
        where: { role: "ASSET_MANAGER", status: "ACTIVE" },
        select: { id: true },
      });
      for (const m of managers) {
        await createNotification(tx, {
          userId: m.id,
          type: "AUDIT_DISCREPANCY",
          title: "Audit discrepancies flagged",
          body: `${cycle.name}: ${missing.length} missing, ${damaged.length} damaged.`,
          entityType: "AuditCycle",
          entityId: cycleId,
        });
      }
    }

    return tx.auditCycle.findUniqueOrThrow({ where: { id: cycleId }, include: CYCLE_INCLUDE });
  });
}

export async function listAuditCycles(actor: SessionUser) {
  const where: Prisma.AuditCycleWhereInput = {};
  if (actor.role !== "ADMIN" && actor.role !== "ASSET_MANAGER") {
    where.assignments = { some: { auditorUserId: actor.id } };
  }
  return db.auditCycle.findMany({ where, include: CYCLE_INCLUDE, orderBy: { createdAt: "desc" } });
}

export async function getAuditCycleDetail(actor: SessionUser, cycleId: string) {
  const cycle = await db.auditCycle.findUnique({
    where: { id: cycleId },
    include: {
      ...CYCLE_INCLUDE,
      items: {
        include: {
          asset: { select: { id: true, assetTag: true, name: true, status: true, location: true } },
          checkedBy: { select: { id: true, name: true } },
        },
        orderBy: { asset: { assetTag: "asc" } },
      },
    },
  });
  if (!cycle) throw new NotFoundError("AuditCycle", cycleId);

  const isAssigned = cycle.assignments.some((a) => a.auditorUserId === actor.id);
  if (actor.role !== "ADMIN" && actor.role !== "ASSET_MANAGER" && !isAssigned) {
    throw new ForbiddenError("You don't have access to this audit cycle");
  }
  return cycle;
}
