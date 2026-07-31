-- CreateEnum
CREATE TYPE "CrmInclusionType" AS ENUM ('ACCOMMODATION', 'MEAL', 'SIGHTSEEING', 'ACTIVITY', 'HOTEL_STAY', 'AIRPORT_PICKUP', 'AIRPORT_DROP', 'DROP_OFF_TRANSFER');

-- Existing destination records retain their state values. The CRM master-data
-- flow permits destinations such as Dubai where this legacy field is not used.
ALTER TABLE "Destination" ALTER COLUMN "state" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayLocation" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "stayLocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferLocation" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTrip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numberOfNights" INTEGER NOT NULL,
    "destinationId" TEXT NOT NULL,
    "airportPickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "airportDropEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripItineraryDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "stayLocationId" TEXT,
    "propertyId" TEXT,
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "lunch" BOOLEAN NOT NULL DEFAULT false,
    "dinner" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isDropOff" BOOLEAN NOT NULL DEFAULT false,
    "dropOffLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripItineraryDayPlace" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTripItineraryDayPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripItineraryDayActivity" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripItineraryDayActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripInclusion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "itineraryDayId" TEXT,
    "type" "CrmInclusionType" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_destinationId_name_key" ON "Place"("destinationId", "name");
CREATE INDEX "Place_destinationId_isActive_idx" ON "Place"("destinationId", "isActive");
CREATE UNIQUE INDEX "StayLocation_destinationId_name_key" ON "StayLocation"("destinationId", "name");
CREATE INDEX "StayLocation_destinationId_isActive_idx" ON "StayLocation"("destinationId", "isActive");
CREATE UNIQUE INDEX "Property_stayLocationId_name_key" ON "Property"("stayLocationId", "name");
CREATE INDEX "Property_stayLocationId_isActive_idx" ON "Property"("stayLocationId", "isActive");
CREATE UNIQUE INDEX "TransferLocation_destinationId_name_key" ON "TransferLocation"("destinationId", "name");
CREATE INDEX "TransferLocation_destinationId_isActive_idx" ON "TransferLocation"("destinationId", "isActive");
CREATE INDEX "CrmTrip_destinationId_idx" ON "CrmTrip"("destinationId");
CREATE INDEX "CrmTrip_createdAt_idx" ON "CrmTrip"("createdAt");
CREATE UNIQUE INDEX "CrmTripItineraryDay_tripId_dayNumber_key" ON "CrmTripItineraryDay"("tripId", "dayNumber");
CREATE INDEX "CrmTripItineraryDay_tripId_idx" ON "CrmTripItineraryDay"("tripId");
CREATE INDEX "CrmTripItineraryDay_stayLocationId_idx" ON "CrmTripItineraryDay"("stayLocationId");
CREATE INDEX "CrmTripItineraryDay_propertyId_idx" ON "CrmTripItineraryDay"("propertyId");
CREATE INDEX "CrmTripItineraryDay_dropOffLocationId_idx" ON "CrmTripItineraryDay"("dropOffLocationId");
CREATE UNIQUE INDEX "CrmTripItineraryDayPlace_itineraryDayId_placeId_key" ON "CrmTripItineraryDayPlace"("itineraryDayId", "placeId");
CREATE INDEX "CrmTripItineraryDayPlace_itineraryDayId_displayOrder_idx" ON "CrmTripItineraryDayPlace"("itineraryDayId", "displayOrder");
CREATE INDEX "CrmTripItineraryDayPlace_placeId_idx" ON "CrmTripItineraryDayPlace"("placeId");
CREATE INDEX "CrmTripItineraryDayActivity_itineraryDayId_displayOrder_idx" ON "CrmTripItineraryDayActivity"("itineraryDayId", "displayOrder");
CREATE UNIQUE INDEX "CrmTripInclusion_tripId_sourceKey_key" ON "CrmTripInclusion"("tripId", "sourceKey");
CREATE INDEX "CrmTripInclusion_tripId_displayOrder_idx" ON "CrmTripInclusion"("tripId", "displayOrder");
CREATE INDEX "CrmTripInclusion_itineraryDayId_idx" ON "CrmTripInclusion"("itineraryDayId");
CREATE INDEX "CrmTripInclusion_type_idx" ON "CrmTripInclusion"("type");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayLocation" ADD CONSTRAINT "StayLocation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_stayLocationId_fkey" FOREIGN KEY ("stayLocationId") REFERENCES "StayLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferLocation" ADD CONSTRAINT "TransferLocation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTrip" ADD CONSTRAINT "CrmTrip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_stayLocationId_fkey" FOREIGN KEY ("stayLocationId") REFERENCES "StayLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_dropOffLocationId_fkey" FOREIGN KEY ("dropOffLocationId") REFERENCES "TransferLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTripItineraryDayPlace" ADD CONSTRAINT "CrmTripItineraryDayPlace_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTripItineraryDayPlace" ADD CONSTRAINT "CrmTripItineraryDayPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTripItineraryDayActivity" ADD CONSTRAINT "CrmTripItineraryDayActivity_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTripInclusion" ADD CONSTRAINT "CrmTripInclusion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTripInclusion" ADD CONSTRAINT "CrmTripInclusion_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
