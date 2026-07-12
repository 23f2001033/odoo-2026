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
  // Room B2 booked 9:00–10:00 tomorrow — the scripted overlap demo
  const roomB2 = assetIds["AF-0501"];
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

  const counts = {
    users: await db.user.count(),
    departments: await db.department.count(),
    categories: await db.category.count(),
    assets: await db.asset.count(),
    allocations: await db.allocation.count(),
    bookings: await db.booking.count(),
    auditItems: await db.auditItem.count(),
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
