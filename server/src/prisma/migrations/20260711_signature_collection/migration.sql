ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "isSignature" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "signatureOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Trip_isSignature_signatureOrder_idx"
  ON "Trip"("isSignature", "signatureOrder");
