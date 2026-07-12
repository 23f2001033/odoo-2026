-- AssetFlow correctness constraints (docs/04-architecture.md §5).
-- These are the last line of defense: business rules are checked in the UI
-- (friendly UX) and in services (friendly errors), but ONLY these constraints
-- guarantee correctness under concurrent requests.

-- ── Rule 1: an asset can have at most ONE active allocation ──────────────
-- Two simultaneous "allocate" transactions cannot both commit: the second
-- insert violates this index and the service maps it to ConflictError
-- ("currently held by …", offering a Transfer Request instead).
CREATE UNIQUE INDEX "one_active_allocation"
  ON "Allocation"("assetId")
  WHERE "status" = 'ACTIVE';

-- ── Rule 2: no overlapping CONFIRMED bookings for the same asset ─────────
-- Half-open range '[)' encodes the spec's boundary rule natively:
--   9:00–10:00 and 10:00–11:00  → do NOT overlap (allowed)
--   9:00–10:00 and 9:30–10:30   → overlap (rejected)
-- Cancelled bookings are excluded, so a freed slot is instantly rebookable.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- tsrange (not tstzrange): Prisma DateTime columns are TIMESTAMP without
-- time zone (UTC by convention), and tstzrange over them needs a
-- timezone-dependent cast that Postgres rejects as non-IMMUTABLE.
ALTER TABLE "Booking" ADD CONSTRAINT "no_booking_overlap"
  EXCLUDE USING gist (
    "assetId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" = 'CONFIRMED');

-- ── Asset tag counter: ensure the single row exists ──────────────────────
INSERT INTO "AssetTagCounter" ("id", "value") VALUES (1, 0)
ON CONFLICT ("id") DO NOTHING;
