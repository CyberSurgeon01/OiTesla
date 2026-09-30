-- schema.prisma declared RideRequest.rating and RideRequest.rating_comment, but no
-- migration in this folder ever created them. Every query that returns a full RideRequest
-- (requestRide's create, cancelRide, the passenger history list) failed with
-- "The column RideRequest.rating does not exist in the current database", so booking and
-- rating were broken on any database built from these migrations.
ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "rating" INTEGER;
ALTER TABLE "RideRequest" ADD COLUMN IF NOT EXISTS "rating_comment" TEXT;
