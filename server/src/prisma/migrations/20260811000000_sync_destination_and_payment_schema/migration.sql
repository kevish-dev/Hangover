-- Bring the deployed baseline in sync with the current Prisma schema.
-- These nullable/defaulted content columns are additive and preserve existing rows.
ALTER TABLE "CrmDestination"
ADD COLUMN "description" TEXT,
ADD COLUMN "highlights" JSONB DEFAULT '[]',
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "images" JSONB DEFAULT '[]';

ALTER TABLE "Destination"
ADD COLUMN "description" TEXT,
ADD COLUMN "highlights" JSONB DEFAULT '[]',
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "images" JSONB DEFAULT '[]';

ALTER TABLE "StayLocation"
ADD COLUMN "highlights" JSONB DEFAULT '[]';

-- receiptNumberInt is sequence-backed and every existing payment has a value.
ALTER TABLE "Payment"
ALTER COLUMN "receiptNumberInt" SET NOT NULL;
