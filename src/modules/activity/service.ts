import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SessionUser } from "@/lib/authz";
import { ActivitySearchInput } from "./validators";

// Read-only by design — this module exposes no write path. Every mutation
// across the app writes its own entry via db.activityLog.create() inside
// its own transaction (docs/04 §8); nothing here can create or edit rows.
export async function listActivityLog(actor: SessionUser, filters: ActivitySearchInput) {
  const where: Prisma.ActivityLogWhereInput = {};

  // Org-wide oversight roles see everything (and may filter by any actor);
  // everyone else only ever sees their own actions — no snooping on peers.
  if (actor.role === "ADMIN" || actor.role === "ASSET_MANAGER") {
    if (filters.actorId) where.actorId = filters.actorId;
  } else {
    where.actorId = actor.id;
  }

  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.action) where.action = { contains: filters.action, mode: "insensitive" };

  const [items, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.activityLog.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}
