-- AlterTable
ALTER TABLE "StayLocation" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "StayLocation" ADD COLUMN IF NOT EXISTS "images" JSONB DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "images" JSONB DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "images" JSONB DEFAULT '[]'::jsonb;
