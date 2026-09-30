-- AlterTable: snapshot the priced fare breakdown at booking time
-- fare_amount alone cannot explain why a historical ride cost what it did, and cannot
-- be re-derived once rates change. Storing the breakdown makes old rides immutable.
ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "fare_breakdown" JSONB;

-- Backfill only the fields that are actually known for historical rows: the amount charged
-- and the seat count. The per-seat and distance components are left NULL on purpose -- the
-- legacy API priced rides with its own formula (including a pool discount), so dividing the
-- total by the seat count would invent a breakdown that was never charged. Rows backfilled
-- this way therefore render as a plain total, and only rides priced by src/lib/fare/pricing.ts
-- show a full breakdown.
UPDATE "RideRequest"
SET "fare_breakdown" = jsonb_build_object(
  'distanceKm', NULL,
  'baseFare', NULL,
  'distanceCharge', NULL,
  'farePerSeat', NULL,
  'seats', "seats_requested",
  'discount', 0,
  'discountReason', NULL,
  'total', "fare_amount"
)
WHERE "fare_breakdown" IS NULL;
