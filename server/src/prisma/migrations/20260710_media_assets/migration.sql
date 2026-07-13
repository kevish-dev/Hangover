DO $$ BEGIN
  CREATE TYPE "MediaResourceType" AS ENUM ('IMAGE', 'VIDEO', 'RAW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaDeliveryType" AS ENUM ('PUBLIC', 'AUTHENTICATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "resourceType" "MediaResourceType" NOT NULL,
  "deliveryType" "MediaDeliveryType" NOT NULL DEFAULT 'PUBLIC',
  "format" TEXT,
  "version" TEXT,
  "bytes" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "folder" TEXT,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "govtIdAssetId" TEXT;
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "aadhaarAssetId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_publicId_key" ON "MediaAsset"("publicId");
CREATE INDEX IF NOT EXISTS "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");
CREATE INDEX IF NOT EXISTS "MediaAsset_deliveryType_idx" ON "MediaAsset"("deliveryType");
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_govtIdAssetId_key" ON "UserProfile"("govtIdAssetId");
CREATE UNIQUE INDEX IF NOT EXISTS "Traveler_aadhaarAssetId_key" ON "Traveler"("aadhaarAssetId");

DO $$ BEGIN
  ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_govtIdAssetId_fkey" FOREIGN KEY ("govtIdAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Traveler" ADD CONSTRAINT "Traveler_aadhaarAssetId_fkey" FOREIGN KEY ("aadhaarAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
