-- CreateEnum
CREATE TYPE "CrmCommonInclusionKey" AS ENUM ('BREAKFAST', 'DINNER', 'ILP_AND_PERMITS', 'TRAVEL', 'VEHICLE_TYPE', 'BBQ', 'BONFIRE', 'TRIP_GUIDE', 'FIRST_AID_KIT');
CREATE TYPE "CrmVehicleType" AS ENUM ('SEDAN', 'SUV', 'INNOVA', 'TRAVELLER');

-- AlterEnum
ALTER TYPE "CrmInclusionType" ADD VALUE 'COMMON';

-- CreateTable
CREATE TABLE "CrmTripCommonInclusion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "key" "CrmCommonInclusionKey" NOT NULL,
    "numberOfDays" INTEGER,
    "isIncluded" BOOLEAN,
    "vehicleType" "CrmVehicleType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripCommonInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmTripCommonInclusion_tripId_key_key" ON "CrmTripCommonInclusion"("tripId", "key");
CREATE INDEX "CrmTripCommonInclusion_tripId_idx" ON "CrmTripCommonInclusion"("tripId");

-- AddForeignKey
ALTER TABLE "CrmTripCommonInclusion" ADD CONSTRAINT "CrmTripCommonInclusion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
