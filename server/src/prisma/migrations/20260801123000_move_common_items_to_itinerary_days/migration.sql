-- CreateTable
CREATE TABLE "CrmTripItineraryDayCommonInclusion" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "key" "CrmCommonInclusionKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTripItineraryDayCommonInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmTripItineraryDayCommonInclusion_itineraryDayId_key_key" ON "CrmTripItineraryDayCommonInclusion"("itineraryDayId", "key");
CREATE INDEX "CrmTripItineraryDayCommonInclusion_itineraryDayId_idx" ON "CrmTripItineraryDayCommonInclusion"("itineraryDayId");

-- The prior trip-wide rows are replaced by explicit day-level records.
DELETE FROM "CrmTripCommonInclusion" WHERE "key" IN ('ILP_AND_PERMITS', 'BBQ', 'BONFIRE', 'TRIP_GUIDE');

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDayCommonInclusion" ADD CONSTRAINT "CrmTripItineraryDayCommonInclusion_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
