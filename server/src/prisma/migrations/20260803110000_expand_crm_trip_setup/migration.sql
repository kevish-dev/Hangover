ALTER TABLE "CrmTrip"
  ADD COLUMN "exclusions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "websiteOverview" TEXT,
  ADD COLUMN "websiteFaqs" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "websiteTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "websiteBannerImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "websiteStayTransportImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "websiteHighlights" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "CrmTripInclusion" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CrmTripPackage" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "tokenAmount" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmTripPackage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmTripPackage_tripId_idx" ON "CrmTripPackage"("tripId");
ALTER TABLE "CrmTripPackage" ADD CONSTRAINT "CrmTripPackage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CrmTripAddOn" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmTripAddOn_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmTripAddOn_tripId_idx" ON "CrmTripAddOn"("tripId");
ALTER TABLE "CrmTripAddOn" ADD CONSTRAINT "CrmTripAddOn_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
