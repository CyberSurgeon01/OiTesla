-- AlterTable: Add email verification fields
ALTER TABLE "User" ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verify_code" TEXT;
ALTER TABLE "User" ADD COLUMN "verify_expires" TIMESTAMP(3);

-- DropIndex: Remove old email-only unique constraint
DROP INDEX IF EXISTS "User_email_key";

-- CreateIndex: Add compound unique constraint on email + role
CREATE UNIQUE INDEX "User_email_role_key" ON "User"("email", "role");

-- Update existing seeded users to be verified
UPDATE "User" SET "is_verified" = true WHERE "email" IN ('jashim@oitesla.com', 'nusrat@oitesla.com', 'rafiq@oitesla.com', 'shirin@oitesla.com');
