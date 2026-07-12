import {
  AssetStatus,
  MaintenanceStatus,
  TransferStatus,
  BookingStatus,
  AuditCycleStatus,
} from "@prisma/client";
import { InvalidTransitionError } from "./errors";

// One generic engine, five machines (docs/04 §6). Every status field in the
// system changes ONLY through assertTransition — an illegal state change is
// impossible, and every legal one is logged by the calling service.

export type Machine<S extends string> = {
  name: string;
  transitions: Partial<Record<S, readonly S[]>>;
};

export function canTransition<S extends string>(
  machine: Machine<S>,
  from: S,
  to: S
): boolean {
  return (machine.transitions[from] ?? []).includes(to);
}

export function assertTransition<S extends string>(
  machine: Machine<S>,
  from: S,
  to: S
): void {
  if (!canTransition(machine, from, to)) {
    throw new InvalidTransitionError(machine.name, from, to);
  }
}

// ── Asset lifecycle ────────────────────────────────────────────────────────
export const assetMachine: Machine<AssetStatus> = {
  name: "asset",
  transitions: {
    AVAILABLE: ["ALLOCATED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "RETIRED"],
    ALLOCATED: ["AVAILABLE", "UNDER_MAINTENANCE", "LOST"],
    RESERVED: ["AVAILABLE", "ALLOCATED"],
    UNDER_MAINTENANCE: ["AVAILABLE", "ALLOCATED", "RETIRED"],
    LOST: ["AVAILABLE"], // found again
    RETIRED: ["DISPOSED"],
    DISPOSED: [], // terminal
  },
};

// ── Maintenance workflow ───────────────────────────────────────────────────
export const maintenanceMachine: Machine<MaintenanceStatus> = {
  name: "maintenance",
  transitions: {
    PENDING: ["APPROVED", "REJECTED"],
    APPROVED: ["ASSIGNED"],
    ASSIGNED: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED"],
    REJECTED: [],
    RESOLVED: [],
  },
};

// ── Transfer workflow ──────────────────────────────────────────────────────
export const transferMachine: Machine<TransferStatus> = {
  name: "transfer",
  transitions: {
    REQUESTED: ["APPROVED", "REJECTED"],
    APPROVED: ["COMPLETED"],
    REJECTED: [],
    COMPLETED: [],
  },
};

// ── Booking (stored states only — Upcoming/Ongoing/Completed derive from time)
export const bookingMachine: Machine<BookingStatus> = {
  name: "booking",
  transitions: {
    CONFIRMED: ["CANCELLED"],
    CANCELLED: [],
  },
};

// ── Audit cycle ────────────────────────────────────────────────────────────
export const auditCycleMachine: Machine<AuditCycleStatus> = {
  name: "auditCycle",
  transitions: {
    OPEN: ["CLOSED"],
    CLOSED: [],
  },
};

// Booking display status, derived — never stored, never stale (docs/04 §3).
export type BookingDisplayStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export function bookingDisplayStatus(b: {
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
}): BookingDisplayStatus {
  if (b.status === "CANCELLED") return "CANCELLED";
  const now = new Date();
  if (now < b.startsAt) return "UPCOMING";
  if (now >= b.endsAt) return "COMPLETED";
  return "ONGOING";
}

// Overdue is likewise derived from time — correct even if cron never runs.
export function isOverdue(a: {
  status: "ACTIVE" | "RETURNED";
  expectedReturnAt: Date | null;
}): boolean {
  return a.status === "ACTIVE" && !!a.expectedReturnAt && a.expectedReturnAt < new Date();
}
