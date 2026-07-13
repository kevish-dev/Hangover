/*
  Warnings:

  - The values [DRIVING_LICENSE,VOTER_ID,PAN,OTHER] on the enum `GovtIdType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GovtIdType_new" AS ENUM ('AADHAAR', 'PASSPORT');
ALTER TABLE "UserProfile" ALTER COLUMN "govtIdType" TYPE "GovtIdType_new" USING ("govtIdType"::text::"GovtIdType_new");
ALTER TYPE "GovtIdType" RENAME TO "GovtIdType_old";
ALTER TYPE "GovtIdType_new" RENAME TO "GovtIdType";
DROP TYPE "public"."GovtIdType_old";
COMMIT;
