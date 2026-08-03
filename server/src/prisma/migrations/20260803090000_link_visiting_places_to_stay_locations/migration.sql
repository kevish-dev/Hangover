-- Move visiting places beneath stay locations. Existing places are preserved
-- under an automatically-created "Imported visiting places" stay location for
-- their destination, so no place records are dropped during the restructure.
ALTER TABLE "Place" ADD COLUMN "stayLocationId" TEXT;

INSERT INTO "StayLocation" ("id", "destinationId", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  md5("destinationId" || ':imported-visiting-places'),
  "destinationId",
  'Imported visiting places',
  'Created automatically while moving visiting places under stay locations.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Place"
GROUP BY "destinationId"
ON CONFLICT ("destinationId", "name") DO NOTHING;

UPDATE "Place" AS place
SET "stayLocationId" = stay."id"
FROM "StayLocation" AS stay
WHERE stay."destinationId" = place."destinationId"
  AND stay."name" = 'Imported visiting places';

ALTER TABLE "Place" ALTER COLUMN "stayLocationId" SET NOT NULL;
ALTER TABLE "Place" DROP CONSTRAINT "Place_destinationId_fkey";
DROP INDEX "Place_destinationId_name_key";
DROP INDEX "Place_destinationId_isActive_idx";
ALTER TABLE "Place" DROP COLUMN "destinationId";

CREATE UNIQUE INDEX "Place_stayLocationId_name_key" ON "Place"("stayLocationId", "name");
CREATE INDEX "Place_stayLocationId_isActive_idx" ON "Place"("stayLocationId", "isActive");
ALTER TABLE "Place" ADD CONSTRAINT "Place_stayLocationId_fkey" FOREIGN KEY ("stayLocationId") REFERENCES "StayLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
