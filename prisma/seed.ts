/**
 * Idempotent demo seed (docs/04 §10) — safe to re-run any time; every record
 * uses a fixed unique key + upsert. Personas match docs/03-product-plan.md §2.
 *
 * Demo logins (password for ALL users: Password123):
 *   asha@assetflow.dev   → Admin
 *   manoj@assetflow.dev  → Asset Manager
 *   deepa@assetflow.dev  → Department Head (Engineering)
 *   raj@assetflow.dev    → Employee
 *   priya@assetflow.dev  → Employee (holds laptop AF-0114)
 *   kiran@assetflow.dev  → Employee (auditor on the open cycle)
 */
import { PrismaClient, AssetStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PASSWORD = "Password123";

function daysFromNow(days: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── departments ──────────────────────────────────────────────────────────
  const deptNames = ["Engineering", "Design", "Operations", "Facilities"] as const;
  const depts: Record<string, { id: string }> = {};
  for (const name of deptNames) {
    depts[name] = await db.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  // hierarchy: Facilities under Operations
  await db.department.update({
    where: { name: "Facilities" },
    data: { parentId: depts["Operations"].id },
  });

  // ── users (personas) ─────────────────────────────────────────────────────
  const users = [
    { name: "Asha Verma", email: "asha@assetflow.dev", role: "ADMIN", dept: "Operations" },
    { name: "Manoj Kumar", email: "manoj@assetflow.dev", role: "ASSET_MANAGER", dept: "Operations" },
    { name: "Deepa Nair", email: "deepa@assetflow.dev", role: "DEPT_HEAD", dept: "Engineering" },
    { name: "Raj Patel", email: "raj@assetflow.dev", role: "EMPLOYEE", dept: "Engineering" },
    { name: "Priya Sharma", email: "priya@assetflow.dev", role: "EMPLOYEE", dept: "Engineering" },
    { name: "Kiran Rao", email: "kiran@assetflow.dev", role: "EMPLOYEE", dept: "Facilities" },
    { name: "Sana Iqbal", email: "sana@assetflow.dev", role: "EMPLOYEE", dept: "Design" },
    { name: "Vikram Singh", email: "vikram@assetflow.dev", role: "EMPLOYEE", dept: "Design" },
    { name: "Meera Joshi", email: "meera@assetflow.dev", role: "EMPLOYEE", dept: "Operations" },
    { name: "Arjun Das", email: "arjun@assetflow.dev", role: "EMPLOYEE", dept: "Engineering" },
  ] as const;

  const u: Record<string, { id: string }> = {};
  for (const usr of users) {
    u[usr.email] = await db.user.upsert({
      where: { email: usr.email },
      update: { role: usr.role as Role, departmentId: depts[usr.dept].id },
      create: {
        name: usr.name,
        email: usr.email,
        passwordHash,
        role: usr.role as Role,
        departmentId: depts[usr.dept].id,
      },
    });
  }
  // Deepa heads Engineering
  await db.department.update({
    where: { name: "Engineering" },
    data: { headId: u["deepa@assetflow.dev"].id },
  });

  // ── categories ───────────────────────────────────────────────────────────
  const categories = [
    {
      name: "Electronics",
      fieldDefs: [{ key: "warrantyMonths", label: "Warranty (months)", type: "number" }],
    },
    { name: "Furniture", fieldDefs: [] },
    {
      name: "Vehicles",
      fieldDefs: [{ key: "registrationNo", label: "Registration No.", type: "text" }],
    },
    { name: "Meeting Rooms", fieldDefs: [{ key: "capacity", label: "Capacity", type: "number" }] },
    { name: "AV Equipment", fieldDefs: [] },
  ];
  const cat: Record<string, { id: string }> = {};
  for (const c of categories) {
    cat[c.name] = await db.category.upsert({
      where: { name: c.name },
      update: { fieldDefs: c.fieldDefs },
      create: { name: c.name, fieldDefs: c.fieldDefs },
    });
  }

  // ── assets ───────────────────────────────────────────────────────────────
  const managerId = u["manoj@assetflow.dev"].id;

  type SeedAsset = {
    tag: string;
    name: string;
    category: string;
    status?: AssetStatus;
    isBookable?: boolean;
    location?: string;
    serial?: string;
    cost?: number;
    attributes?: Record<string, unknown>;
  };

  const assets: SeedAsset[] = [
    // laptops (Electronics)
    ...Array.from({ length: 12 }, (_, i) => ({
      tag: `AF-01${String(i + 1).padStart(2, "0")}`,
      name: `Dell Latitude 5440 #${i + 1}`,
      category: "Electronics",
      location: "HQ Floor 2",
      serial: `DL5440-${1000 + i}`,
      cost: 72000,
      attributes: { warrantyMonths: 36 },
    })),
    // the scripted conflict laptop
    {
      tag: "AF-0114",
      name: "MacBook Pro 14 (M4)",
      category: "Electronics",
      status: "ALLOCATED",
      location: "HQ Floor 2",
      serial: "MBP14-M4-042",
      cost: 195000,
      attributes: { warrantyMonths: 12 },
    },
    // monitors, phones
    ...Array.from({ length: 6 }, (_, i) => ({
      tag: `AF-02${String(i + 1).padStart(2, "0")}`,
      name: `LG UltraFine 27" #${i + 1}`,
      category: "Electronics",
      location: "HQ Floor 1",
      cost: 28000,
      attributes: { warrantyMonths: 24 },
    })),
    // furniture
    ...Array.from({ length: 8 }, (_, i) => ({
      tag: `AF-03${String(i + 1).padStart(2, "0")}`,
      name: `Ergonomic Chair #${i + 1}`,
      category: "Furniture",
      location: i < 4 ? "HQ Floor 1" : "HQ Floor 2",
      cost: 14500,
    })),
    // vehicles
    {
      tag: "AF-0401",
      name: "Tata Ace Delivery Van",
      category: "Vehicles",
      isBookable: true,
      location: "Basement Parking",
      cost: 650000,
      attributes: { registrationNo: "KA-01-AB-4321" },
    },
    // bookable rooms & AV
    {
      tag: "AF-0501",
      name: "Room B2 (Conference)",
      category: "Meeting Rooms",
      isBookable: true,
      location: "HQ Floor 1",
      attributes: { capacity: 10 },
    },
    {
      tag: "AF-0502",
      name: "Room A1 (Huddle)",
      category: "Meeting Rooms",
      isBookable: true,
      location: "HQ Floor 1",
      attributes: { capacity: 4 },
    },
    {
      tag: "AF-0601",
      name: "Epson Projector",
      category: "AV Equipment",
      isBookable: true,
      location: "Store Room",
      cost: 55000,
    },
    // one retired, one under-maintenance-history asset
    { tag: "AF-0701", name: "HP LaserJet (old)", category: "Electronics", status: "RETIRED", location: "Store Room" },
    { tag: "AF-0702", name: "Canon Scanner", category: "Electronics", location: "HQ Floor 1", cost: 32000 },
  ];

  const assetIds: Record<string, string> = {};
  for (const a of assets) {
    const row = await db.asset.upsert({
      where: { assetTag: a.tag },
      update: { status: a.status ?? "AVAILABLE", isBookable: a.isBookable ?? false },
      create: {
        assetTag: a.tag,
        name: a.name,
        categoryId: cat[a.category].id,
        status: a.status ?? "AVAILABLE",
        isBookable: a.isBookable ?? false,
        location: a.location,
        serialNumber: a.serial,
        acquisitionCost: a.cost,
        acquisitionDate: daysFromNow(-200 - Math.floor(Math.random() * 400)),
        attributes: (a.attributes ?? {}) as object,
        createdById: managerId,
      },
    });
    assetIds[a.tag] = row.id;
  }

  // keep the tag counter ahead of seeded tags so new registrations don't collide
  await db.assetTagCounter.upsert({
    where: { id: 1 },
    update: { value: { set: 800 } },
    create: { id: 1, value: 800 },
  });

  // ── allocations ──────────────────────────────────────────────────────────
  // Priya holds AF-0114 (the scripted double-allocation conflict)
  const priyaAlloc = await db.allocation.findFirst({
    where: { assetId: assetIds["AF-0114"], status: "ACTIVE" },
  });
  if (!priyaAlloc) {
    await db.allocation.create({
      data: {
        assetId: assetIds["AF-0114"],
        holderUserId: u["priya@assetflow.dev"].id,
        allocatedById: managerId,
        allocatedAt: daysFromNow(-30),
        expectedReturnAt: daysFromNow(60),
      },
    });
  }

  // A deliberately OVERDUE allocation → dashboard shows the red banner on load
  const overdueAsset = assetIds["AF-0101"];
  const overdueAlloc = await db.allocation.findFirst({
    where: { assetId: overdueAsset, status: "ACTIVE" },
  });
  if (!overdueAlloc) {
    await db.allocation.create({
      data: {
        assetId: overdueAsset,
        holderUserId: u["arjun@assetflow.dev"].id,
        allocatedById: managerId,
        allocatedAt: daysFromNow(-45),
        expectedReturnAt: daysFromNow(-5), // 5 days overdue
      },
    });
    await db.asset.update({ where: { id: overdueAsset }, data: { status: "ALLOCATED" } });
  }

  // ── bookings ─────────────────────────────────────────────────────────────
  // Room B2 booked 9:00–10:00 tomorrow — the scripted overlap demo. Never
  // touch this exact slot below; everything else just needs to not collide.
  const roomB2 = assetIds["AF-0501"];
  const roomA1 = assetIds["AF-0502"];
  const projector = assetIds["AF-0601"];
  const b2Start = daysFromNow(1, 9);
  const existingB2 = await db.booking.findFirst({
    where: { assetId: roomB2, startsAt: b2Start, status: "CONFIRMED" },
  });
  if (!existingB2) {
    await db.booking.create({
      data: {
        assetId: roomB2,
        bookedById: u["sana@assetflow.dev"].id,
        startsAt: b2Start,
        endsAt: daysFromNow(1, 10),
        purpose: "Design review",
      },
    });
  }

  // A spread of additional bookings so the calendar and heatmap aren't a
  // near-empty grid — a mix of past (for utilization/heatmap history) and
  // upcoming (visible on first load of the week view).
  const extraBookings: { asset: string; day: number; hour: number; duration: number; by: string; purpose: string }[] = [
    { asset: roomB2, day: 2, hour: 14, duration: 1, by: "vikram@assetflow.dev", purpose: "Sprint planning" },
    { asset: roomA1, day: 1, hour: 11, duration: 1, by: "raj@assetflow.dev", purpose: "1:1 sync" },
    { asset: roomA1, day: 3, hour: 15, duration: 2, by: "meera@assetflow.dev", purpose: "Vendor call" },
    { asset: projector, day: 4, hour: 10, duration: 1, by: "sana@assetflow.dev", purpose: "Client demo" },
    { asset: roomB2, day: -3, hour: 9, duration: 1, by: "deepa@assetflow.dev", purpose: "Team standup" },
    { asset: roomA1, day: -5, hour: 13, duration: 1, by: "arjun@assetflow.dev", purpose: "Code review" },
    { asset: roomB2, day: -8, hour: 16, duration: 1, by: "vikram@assetflow.dev", purpose: "Retro" },
  ];
  for (const b of extraBookings) {
    const startsAt = daysFromNow(b.day, b.hour);
    const exists = await db.booking.findFirst({ where: { assetId: b.asset, startsAt } });
    if (!exists) {
      await db.booking.create({
        data: {
          assetId: b.asset,
          bookedById: u[b.by].id,
          startsAt,
          endsAt: daysFromNow(b.day, b.hour + b.duration),
          purpose: b.purpose,
          // status is always CONFIRMED — "Completed" is a derived display
          // status computed from endsAt < now() (lib/stateMachine.ts), never
          // a stored value; BookingStatus only has CONFIRMED/CANCELLED.
        },
      }).catch(() => null); // skip silently on an overlap collision with the fixed slots above
    }
  }

  // A booking anchored to the literal moment the seed runs (not a fixed
  // hour like the ones above) so the dashboard's "Active Bookings" KPI —
  // which counts startsAt <= now < endsAt live, not a stored total — reads
  // non-zero right after reseeding. Re-seed shortly before recording a demo.
  // Refreshed in place (not re-created) each run so re-seeding stays idempotent.
  const liveWindow = { startsAt: new Date(Date.now() - 15 * 60 * 1000), endsAt: new Date(Date.now() + 45 * 60 * 1000) };
  const liveBooking = await db.booking.findFirst({
    where: { assetId: roomA1, purpose: "Live demo booking" },
  });
  if (liveBooking) {
    await db.booking.update({ where: { id: liveBooking.id }, data: liveWindow }).catch(() => null);
  } else {
    await db.booking
      .create({
        data: { assetId: roomA1, bookedById: u["meera@assetflow.dev"].id, purpose: "Live demo booking", ...liveWindow },
      })
      .catch(() => null); // skip silently if it collides with an existing slot
  }

  // ── maintenance history (feeds the frequency report) ─────────────────────
  const scannerId = assetIds["AF-0702"];
  const existingMaint = await db.maintenanceRequest.findFirst({
    where: { assetId: scannerId, status: "RESOLVED" },
  });
  if (!existingMaint) {
    await db.maintenanceRequest.create({
      data: {
        assetId: scannerId,
        raisedById: u["meera@assetflow.dev"].id,
        title: "Paper feed jamming",
        description: "Scanner jams on every third page since last week.",
        priority: "MEDIUM",
        status: "RESOLVED",
        decidedById: managerId,
        decidedAt: daysFromNow(-20),
        technicianName: "CityTech Services",
        assignedAt: daysFromNow(-19),
        startedAt: daysFromNow(-18),
        resolvedAt: daysFromNow(-17),
        resolutionNotes: "Replaced feed rollers.",
        createdAt: daysFromNow(-21),
      },
    });
  }

  // A PENDING request (different asset than the resolved one above) so the
  // Maintenance screen shows the full range of statuses without colliding
  // with the live "raise a ticket" demo moment.
  const laptop108 = assetIds["AF-0108"];
  const existingPendingMaint = await db.maintenanceRequest.findFirst({
    where: { assetId: laptop108, status: "PENDING" },
  });
  if (!existingPendingMaint) {
    await db.maintenanceRequest.create({
      data: {
        assetId: laptop108,
        raisedById: u["vikram@assetflow.dev"].id,
        title: "Battery draining fast",
        description: "Battery drops from 100% to 20% in under two hours even when idle.",
        priority: "LOW",
        createdAt: daysFromNow(-1),
      },
    });
  }

  // ── a pending transfer request (different asset than AF-0114, which stays
  // reserved for the live double-allocation conflict demo) ──────────────────
  const laptop109 = assetIds["AF-0109"];
  let meeraAlloc109 = await db.allocation.findFirst({
    where: { assetId: laptop109, status: "ACTIVE" },
  });
  if (!meeraAlloc109) {
    meeraAlloc109 = await db.allocation.create({
      data: {
        assetId: laptop109,
        holderUserId: u["meera@assetflow.dev"].id,
        allocatedById: managerId,
        allocatedAt: daysFromNow(-40),
      },
    });
    await db.asset.update({ where: { id: laptop109 }, data: { status: "ALLOCATED" } });
  }
  const existingTransfer = await db.transferRequest.findFirst({
    where: { allocationId: meeraAlloc109.id, status: "REQUESTED" },
  });
  if (!existingTransfer) {
    await db.transferRequest.create({
      data: {
        allocationId: meeraAlloc109.id,
        assetId: laptop109,
        requestedById: u["vikram@assetflow.dev"].id,
        targetUserId: u["vikram@assetflow.dev"].id,
        reason: "Meera is moving to a desktop setup; I need a spare laptop for travel.",
        createdAt: daysFromNow(-1),
      },
    });
  }

  // ── a CLOSED audit cycle showing the full lifecycle (Missing→Lost,
  // Damaged→auto-raised maintenance) without needing to run one live ────────
  // "Q3 Floor-1 Audit" below stays OPEN and untouched for the live demo.
  const missingAsset = assetIds["AF-0105"];
  const damagedAsset = assetIds["AF-0106"];
  const verifiedAsset = assetIds["AF-0107"];
  let closedCycle = await db.auditCycle.findFirst({ where: { name: "Floor 2 Spot Check (Q2)" } });
  if (!closedCycle) {
    closedCycle = await db.auditCycle.create({
      data: {
        name: "Floor 2 Spot Check (Q2)",
        scopeLocation: "HQ Floor 2",
        startsAt: daysFromNow(-14),
        endsAt: daysFromNow(-10),
        status: "CLOSED",
        closedAt: daysFromNow(-10),
        createdById: u["asha@assetflow.dev"].id,
      },
    });
    await db.auditAssignment.create({
      data: { cycleId: closedCycle.id, auditorUserId: u["deepa@assetflow.dev"].id },
    });
    await db.auditItem.createMany({
      data: [
        { cycleId: closedCycle.id, assetId: missingAsset, result: "MISSING", notes: "Not at desk, nobody recalls seeing it since the move.", checkedById: u["deepa@assetflow.dev"].id, checkedAt: daysFromNow(-11) },
        { cycleId: closedCycle.id, assetId: damagedAsset, result: "DAMAGED", notes: "Hinge cracked, screen flickers when opened past 90°.", checkedById: u["deepa@assetflow.dev"].id, checkedAt: daysFromNow(-11) },
        { cycleId: closedCycle.id, assetId: verifiedAsset, result: "VERIFIED", checkedById: u["deepa@assetflow.dev"].id, checkedAt: daysFromNow(-11) },
      ],
    });
    // Apply the same cascade closeAuditCycle() would (docs/04 §6) — seeded
    // directly since this bypasses the service layer for speed/control.
    await db.asset.update({ where: { id: missingAsset }, data: { status: "LOST" } });
    await db.maintenanceRequest.create({
      data: {
        assetId: damagedAsset,
        raisedById: u["deepa@assetflow.dev"].id,
        title: "Damage confirmed during audit: Floor 2 Spot Check (Q2)",
        description: "Hinge cracked, screen flickers when opened past 90°.",
        priority: "HIGH",
        createdAt: daysFromNow(-10),
      },
    });
  }

  // ── open audit cycle with Kiran assigned ─────────────────────────────────
  let cycle = await db.auditCycle.findFirst({ where: { name: "Q3 Floor-1 Audit" } });
  if (!cycle) {
    cycle = await db.auditCycle.create({
      data: {
        name: "Q3 Floor-1 Audit",
        scopeLocation: "HQ Floor 1",
        startsAt: daysFromNow(-2),
        endsAt: daysFromNow(12),
        createdById: u["asha@assetflow.dev"].id,
      },
    });
    await db.auditAssignment.create({
      data: { cycleId: cycle.id, auditorUserId: u["kiran@assetflow.dev"].id },
    });
    // snapshot floor-1 assets into the cycle
    const floor1Assets = await db.asset.findMany({ where: { location: "HQ Floor 1" } });
    await db.auditItem.createMany({
      data: floor1Assets.map((a) => ({ cycleId: cycle!.id, assetId: a.id })),
      skipDuplicates: true,
    });
  }

  // ── activity log + notifications ──────────────────────────────────────────
  // Seeded directly (not through the service layer, which the rest of this
  // script also bypasses for speed) so the Activity and Notifications
  // screens aren't empty on a fresh load — every other milestone's service
  // writes these automatically once real actions happen through the app.
  const activityEntries: { actorId: string; action: string; entityType: string; entityId: string; meta?: object; createdAt: Date }[] = [
    { actorId: u["asha@assetflow.dev"].id, action: "department.created", entityType: "Department", entityId: depts["Engineering"].id, meta: { name: "Engineering" }, createdAt: daysFromNow(-60) },
    { actorId: u["asha@assetflow.dev"].id, action: "user.role_assigned", entityType: "User", entityId: u["manoj@assetflow.dev"].id, meta: { from: "EMPLOYEE", to: "ASSET_MANAGER" }, createdAt: daysFromNow(-58) },
    { actorId: managerId, action: "asset.registered", entityType: "Asset", entityId: assetIds["AF-0114"], meta: { assetTag: "AF-0114" }, createdAt: daysFromNow(-32) },
    { actorId: managerId, action: "allocation.created", entityType: "Asset", entityId: assetIds["AF-0114"], meta: { holder: "Priya Sharma" }, createdAt: daysFromNow(-30) },
    { actorId: managerId, action: "allocation.created", entityType: "Asset", entityId: overdueAsset, meta: { holder: "Arjun Das" }, createdAt: daysFromNow(-45) },
    { actorId: u["sana@assetflow.dev"].id, action: "booking.created", entityType: "Asset", entityId: roomB2, meta: { purpose: "Design review" }, createdAt: daysFromNow(-1) },
    { actorId: u["meera@assetflow.dev"].id, action: "maintenance.raised", entityType: "Asset", entityId: scannerId, meta: { title: "Paper feed jamming" }, createdAt: daysFromNow(-21) },
    { actorId: managerId, action: "maintenance.resolved", entityType: "Asset", entityId: scannerId, meta: { assetStatus: "AVAILABLE" }, createdAt: daysFromNow(-17) },
    { actorId: u["vikram@assetflow.dev"].id, action: "maintenance.raised", entityType: "Asset", entityId: laptop108, meta: { title: "Battery draining fast" }, createdAt: daysFromNow(-1) },
    { actorId: u["vikram@assetflow.dev"].id, action: "transfer.requested", entityType: "Asset", entityId: laptop109, meta: { targetLabel: "Vikram Singh" }, createdAt: daysFromNow(-1) },
    { actorId: u["deepa@assetflow.dev"].id, action: "audit.cycle_closed", entityType: "AuditCycle", entityId: closedCycle.id, meta: { missingCount: 1, damagedCount: 1 }, createdAt: daysFromNow(-10) },
    { actorId: u["asha@assetflow.dev"].id, action: "audit.cycle_created", entityType: "AuditCycle", entityId: cycle.id, meta: { name: "Q3 Floor-1 Audit" }, createdAt: daysFromNow(-2) },
  ];
  for (const entry of activityEntries) {
    const exists = await db.activityLog.findFirst({ where: { action: entry.action, entityId: entry.entityId, actorId: entry.actorId } });
    if (!exists) await db.activityLog.create({ data: entry });
  }

  const notifications: { userId: string; type: "ASSET_ASSIGNED" | "OVERDUE_RETURN" | "TRANSFER_REQUESTED" | "MAINTENANCE_REQUESTED" | "AUDIT_DISCREPANCY"; title: string; body: string; entityType: string; entityId: string; readAt?: Date; createdAt: Date }[] = [
    { userId: u["priya@assetflow.dev"].id, type: "ASSET_ASSIGNED", title: "Asset assigned", body: "MacBook Pro 14 (M4) (AF-0114) has been allocated.", entityType: "Asset", entityId: assetIds["AF-0114"], readAt: daysFromNow(-29), createdAt: daysFromNow(-30) },
    { userId: u["arjun@assetflow.dev"].id, type: "OVERDUE_RETURN", title: "Overdue return", body: "Dell Latitude 5440 #1 (AF-0101) was due back 5 days ago.", entityType: "Asset", entityId: overdueAsset, createdAt: daysFromNow(-5) },
    { userId: managerId, type: "OVERDUE_RETURN", title: "Overdue return — action may be needed", body: "Arjun Das has not returned Dell Latitude 5440 #1 (AF-0101).", entityType: "Asset", entityId: overdueAsset, createdAt: daysFromNow(-5) },
    { userId: u["meera@assetflow.dev"].id, type: "TRANSFER_REQUESTED", title: "Transfer requested for your asset", body: "Vikram Singh requested a transfer of Dell Latitude 5440 #9 (AF-0109).", entityType: "Asset", entityId: laptop109, createdAt: daysFromNow(-1) },
    { userId: managerId, type: "MAINTENANCE_REQUESTED", title: "Maintenance request awaiting review", body: "Vikram Singh reported an issue with Dell Latitude 5440 #8 (AF-0108): Battery draining fast.", entityType: "Asset", entityId: laptop108, createdAt: daysFromNow(-1) },
    { userId: managerId, type: "AUDIT_DISCREPANCY", title: "Audit discrepancies flagged", body: "Floor 2 Spot Check (Q2): 1 missing, 1 damaged.", entityType: "AuditCycle", entityId: closedCycle.id, readAt: daysFromNow(-9), createdAt: daysFromNow(-10) },
  ];
  for (const n of notifications) {
    const exists = await db.notification.findFirst({ where: { userId: n.userId, type: n.type, entityId: n.entityId } });
    if (!exists) await db.notification.create({ data: n });
  }

  const counts = {
    users: await db.user.count(),
    departments: await db.department.count(),
    categories: await db.category.count(),
    assets: await db.asset.count(),
    allocations: await db.allocation.count(),
    bookings: await db.booking.count(),
    maintenanceRequests: await db.maintenanceRequest.count(),
    transferRequests: await db.transferRequest.count(),
    auditCycles: await db.auditCycle.count(),
    auditItems: await db.auditItem.count(),
    activityLog: await db.activityLog.count(),
    notifications: await db.notification.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`\nDemo login → asha@assetflow.dev / ${PASSWORD} (see file header for all users)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
