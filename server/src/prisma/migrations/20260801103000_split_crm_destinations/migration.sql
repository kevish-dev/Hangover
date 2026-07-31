-- CreateTable
CREATE TABLE "CrmDestination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDestination_pkey" PRIMARY KEY ("id")
);

-- Preserve existing CRM references while severing the CRM domain from the
-- website catalogue. Existing website destinations are copied once as CRM
-- master records using the same IDs, then all CRM foreign keys are retargeted.
INSERT INTO "CrmDestination" ("id", "name", "createdAt", "updatedAt")
SELECT "id", "name", "createdAt", "updatedAt"
FROM "Destination";

-- CreateIndex
CREATE UNIQUE INDEX "CrmDestination_name_key" ON "CrmDestination"("name");

-- Retarget existing CRM master-data and CRM-trip foreign keys.
ALTER TABLE "Place" DROP CONSTRAINT "Place_destinationId_fkey";
ALTER TABLE "StayLocation" DROP CONSTRAINT "StayLocation_destinationId_fkey";
ALTER TABLE "TransferLocation" DROP CONSTRAINT "TransferLocation_destinationId_fkey";
ALTER TABLE "CrmTrip" DROP CONSTRAINT "CrmTrip_destinationId_fkey";

ALTER TABLE "Place" ADD CONSTRAINT "Place_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayLocation" ADD CONSTRAINT "StayLocation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferLocation" ADD CONSTRAINT "TransferLocation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTrip" ADD CONSTRAINT "CrmTrip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
