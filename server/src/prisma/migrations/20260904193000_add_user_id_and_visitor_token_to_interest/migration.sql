-- AlterTable
ALTER TABLE "InterestSubmission" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "InterestSubmission" ADD COLUMN IF NOT EXISTS "visitorToken" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InterestSubmission_userId_idx" ON "InterestSubmission"("userId");
CREATE INDEX IF NOT EXISTS "InterestSubmission_visitorToken_idx" ON "InterestSubmission"("visitorToken");

-- AddForeignKey
ALTER TABLE "InterestSubmission" ADD CONSTRAINT "InterestSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

