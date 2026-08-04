-- AlterEnum
ALTER TYPE "CrmInclusionType" ADD VALUE IF NOT EXISTS 'TRANSPORT';

-- AlterTable
ALTER TABLE "CrmTripItineraryDay" ADD COLUMN IF NOT EXISTS "transportEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CrmTripItineraryDay" ADD COLUMN IF NOT EXISTS "transportText" TEXT;
