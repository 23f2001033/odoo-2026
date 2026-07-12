import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { SessionUser } from "@/lib/authz";
import { assertTransition, assetMachine } from "@/lib/stateMachine";
import { AssetCreateInput, AssetSearchInput, AssetUpdateInput } from "./validators";

type FieldDef = { key: string; label: string; type: "text" | "number" | "date" };

// Coerces raw form values (always strings/numbers from JSON) against the
// category's field definitions — unknown keys are dropped, type mismatches
// throw ValidationError with the field's human label.
function coerceAttributes(
  fieldDefs: FieldDef[],
  raw: Record<string, unknown>
): Prisma.InputJsonValue {
  const out: Record<string, string | number> = {};
  for (const def of fieldDefs) {
    const value = raw[def.key];
    if (value === undefined || value === null || value === "") continue;
    if (def.type === "number") {
      const n = Number(value);
      if (Number.isNaN(n)) throw new ValidationError(`${def.label} must be a number`);
      out[def.key] = n;
    } else if (def.type === "date") {
      const d = new Date(value as string);
      if (Number.isNaN(d.getTime())) throw new ValidationError(`${def.label} must be a valid date`);
      out[def.key] = d.toISOString();
    } else {
      out[def.key] = String(value);
    }
  }
  return out as Prisma.InputJsonValue;
}

// ─────────────────────────── register / update ───────────────────────────

// Tag generation is race-safe: the counter row is locked for the duration of
// this transaction, so concurrent registrations serialize on it and never
// collide (docs/04 §3 — AssetTagCounter).
export async function registerAsset(actor: SessionUser, input: AssetCreateInput) {
  const category = await db.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new NotFoundError("Category", input.categoryId);
  const attributes = coerceAttributes(category.fieldDefs as unknown as FieldDef[], input.attributes);

  return db.$transaction(async (tx) => {
    const counter = await tx.assetTagCounter.update({
      where: { id: 1 },
      data: { value: { increment: 1 } },
    });
    const assetTag = `AF-${String(counter.value).padStart(4, "0")}`;

    const asset = await tx.asset.create({
      data: {
        assetTag,
        name: input.name,
        categoryId: input.categoryId,
        serialNumber: input.serialNumber ?? null,
        acquisitionDate: input.acquisitionDate ?? null,
        acquisitionCost: input.acquisitionCost ?? null,
        condition: input.condition,
        location: input.location ?? null,
        isBookable: input.isBookable,
        photoUrl: input.photoUrl ?? null,
        attributes,
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "asset.registered",
        entityType: "Asset",
        entityId: asset.id,
        meta: { assetTag: asset.assetTag, name: asset.name },
      },
    });

    return asset;
  });
}

export async function updateAsset(actor: SessionUser, id: string, input: AssetUpdateInput) {
  const asset = await db.asset.findUnique({ where: { id }, include: { category: true } });
  if (!asset) throw new NotFoundError("Asset", id);

  const attributes = input.attributes
    ? coerceAttributes(asset.category.fieldDefs as unknown as FieldDef[], input.attributes)
    : undefined;

  return db.$transaction(async (tx) => {
    const updated = await tx.asset.update({
      where: { id },
      data: {
        name: input.name,
        serialNumber: input.serialNumber,
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: input.acquisitionCost,
        condition: input.condition,
        location: input.location,
        isBookable: input.isBookable,
        photoUrl: input.photoUrl,
        attributes,
      },
    });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "asset.updated",
        entityType: "Asset",
        entityId: id,
        meta: { changes: { ...input, attributes: input.attributes } as object },
      },
    });
    return updated;
  });
}

// ─────────────────────────── lifecycle transitions ───────────────────────────
// Only retire/dispose live here — allocation, maintenance approval, and audit
// closure own the other asset-status transitions in their respective modules
// (docs/04 §6). Every change goes through assertTransition, so an illegal
// jump (e.g. disposing a still-Allocated asset) is impossible.

export async function retireAsset(actor: SessionUser, id: string) {
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) throw new NotFoundError("Asset", id);
  assertTransition(assetMachine, asset.status, "RETIRED");

  return db.$transaction(async (tx) => {
    const updated = await tx.asset.update({ where: { id }, data: { status: "RETIRED" } });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "asset.retired",
        entityType: "Asset",
        entityId: id,
        meta: { from: asset.status },
      },
    });
    return updated;
  });
}

export async function disposeAsset(actor: SessionUser, id: string) {
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) throw new NotFoundError("Asset", id);
  assertTransition(assetMachine, asset.status, "DISPOSED");

  return db.$transaction(async (tx) => {
    const updated = await tx.asset.update({ where: { id }, data: { status: "DISPOSED" } });
    await tx.activityLog.create({
      data: {
        actorId: actor.id,
        action: "asset.disposed",
        entityType: "Asset",
        entityId: id,
        meta: { from: asset.status },
      },
    });
    return updated;
  });
}

// ─────────────────────────── reads ───────────────────────────

export async function getAssetById(id: string) {
  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!asset) throw new NotFoundError("Asset", id);
  return asset;
}

export async function getAssetByTag(tag: string) {
  const asset = await db.asset.findUnique({ where: { assetTag: tag }, select: { id: true } });
  if (!asset) throw new NotFoundError("Asset", tag);
  return asset;
}

// Allocation/maintenance modules land in later milestones (M3/M5); these are
// read-only projections for the asset detail page's history sections and own
// no business logic, so they live here rather than blocking on those modules.
export function getAssetAllocationHistory(assetId: string) {
  return db.allocation.findMany({
    where: { assetId },
    orderBy: { allocatedAt: "desc" },
    include: {
      holderUser: { select: { id: true, name: true } },
      holderDept: { select: { id: true, name: true } },
      allocatedBy: { select: { id: true, name: true } },
    },
  });
}

export function getAssetMaintenanceHistory(assetId: string) {
  return db.maintenanceRequest.findMany({
    where: { assetId },
    orderBy: { createdAt: "desc" },
    include: { raisedBy: { select: { id: true, name: true } } },
  });
}

export function listLocations(): Promise<{ location: string }[]> {
  return db.asset.findMany({
    where: { location: { not: null } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  }) as Promise<{ location: string }[]>;
}

// ─────────────────────────── search ───────────────────────────

export async function searchAssets(filters: AssetSearchInput) {
  const where: Prisma.AssetWhereInput = {};

  if (filters.q) {
    where.OR = [
      { assetTag: { contains: filters.q, mode: "insensitive" } },
      { serialNumber: { contains: filters.q, mode: "insensitive" } },
      { name: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.status) where.status = filters.status;
  if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };
  if (filters.bookable !== undefined) where.isBookable = filters.bookable;
  if (filters.departmentId) {
    where.allocations = {
      some: {
        status: "ACTIVE",
        OR: [
          { holderDeptId: filters.departmentId },
          { holderUser: { departmentId: filters.departmentId } },
        ],
      },
    };
  }

  const [items, total] = await Promise.all([
    db.asset.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.asset.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}
