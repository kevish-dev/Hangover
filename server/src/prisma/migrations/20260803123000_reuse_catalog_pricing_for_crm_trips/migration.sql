-- CRM itinerary trips use the same package and add-on records as normal trips.
-- This retains booking compatibility and gives both trip types the full add-on
-- field set (image, limits, cutoff and active status).
ALTER TABLE "Package" ADD COLUMN "crmTripId" TEXT;
ALTER TABLE "AddOn" ADD COLUMN "crmTripId" TEXT;

CREATE INDEX "Package_crmTripId_idx" ON "Package"("crmTripId");
CREATE INDEX "AddOn_crmTripId_idx" ON "AddOn"("crmTripId");

ALTER TABLE "Package"
  ADD CONSTRAINT "Package_crmTripId_fkey"
  FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AddOn"
  ADD CONSTRAINT "AddOn_crmTripId_fkey"
  FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Package" ("id", "crmTripId", "title", "price", "tokenAmount", "createdAt", "updatedAt")
SELECT "id", "tripId", "title", "price", "tokenAmount", "createdAt", "updatedAt"
FROM "CrmTripPackage";

INSERT INTO "AddOn" ("id", "crmTripId", "title", "description", "price", "isActive", "createdAt", "updatedAt")
SELECT "id", "tripId", "title", "description", "price", "isActive", "createdAt", "updatedAt"
FROM "CrmTripAddOn";

DROP TABLE "CrmTripPackage";
DROP TABLE "CrmTripAddOn";
