-- CRM trips are becoming the primary trip-creation workflow, so retain the
-- same publication and catalogue controls as standard trips.
ALTER TABLE "CrmTrip"
  ADD COLUMN "tripType" "TripType",
  ADD COLUMN "bestTimeToVisit" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isListed" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "CrmTrip_isActive_idx" ON "CrmTrip"("isActive");
CREATE INDEX "CrmTrip_isFeatured_idx" ON "CrmTrip"("isFeatured");
CREATE INDEX "CrmTrip_isPublished_idx" ON "CrmTrip"("isPublished");
CREATE INDEX "CrmTrip_isListed_idx" ON "CrmTrip"("isListed");
