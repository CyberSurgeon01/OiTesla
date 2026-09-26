-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TESLA_PAY');

-- AlterTable
ALTER TABLE "RideRequest" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
