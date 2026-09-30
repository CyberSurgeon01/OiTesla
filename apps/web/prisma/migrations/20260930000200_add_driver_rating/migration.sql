-- A passenger could rate the driver (RideRequest.rating / rating_comment) but a driver had
-- no way to rate a passenger, so passengers could never see any feedback on a trip.
-- Mirroring the two existing columns on the ride row keeps both directions readable
-- without a join, and needs no backfill: existing rows have no driver rating and correctly
-- read as "the driver has not rated this rider yet".
ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "driver_rating" INTEGER;
ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "driver_rating_comment" TEXT;
