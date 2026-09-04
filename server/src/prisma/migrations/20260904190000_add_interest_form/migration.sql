-- AlterTable
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "isInterestFormEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Festival" ADD COLUMN IF NOT EXISTS "isInterestFormEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CrmTrip" ADD COLUMN IF NOT EXISTS "isInterestFormEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CrmFestival" ADD COLUMN IF NOT EXISTS "isInterestFormEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "InterestSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "crmTripId" TEXT,
    "crmFestivalId" TEXT,
    "tripId" TEXT,
    "festivalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InterestSubmission_crmTripId_idx" ON "InterestSubmission"("crmTripId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InterestSubmission_crmFestivalId_idx" ON "InterestSubmission"("crmFestivalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InterestSubmission_tripId_idx" ON "InterestSubmission"("tripId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InterestSubmission_festivalId_idx" ON "InterestSubmission"("festivalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InterestSubmission_createdAt_idx" ON "InterestSubmission"("createdAt");

-- AddForeignKey
ALTER TABLE "InterestSubmission" ADD CONSTRAINT "InterestSubmission_crmTripId_fkey" FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestSubmission" ADD CONSTRAINT "InterestSubmission_crmFestivalId_fkey" FOREIGN KEY ("crmFestivalId") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestSubmission" ADD CONSTRAINT "InterestSubmission_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestSubmission" ADD CONSTRAINT "InterestSubmission_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
