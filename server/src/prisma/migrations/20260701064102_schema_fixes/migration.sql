/*
  Warnings:

  - The values [CONTENT_MANAGER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `govtIdRejectionReason` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `govtIdVerificationStatus` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `govtIdVerifiedAt` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `govtIdVerifiedBy` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `profileImageUrl` on the `UserProfile` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropIndex
DROP INDEX "UserProfile_govtIdVerificationStatus_idx";

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "govtIdRejectionReason",
DROP COLUMN "govtIdVerificationStatus",
DROP COLUMN "govtIdVerifiedAt",
DROP COLUMN "govtIdVerifiedBy",
DROP COLUMN "profileImageUrl";

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
