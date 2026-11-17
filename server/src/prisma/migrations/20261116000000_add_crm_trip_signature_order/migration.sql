ALTER TABLE "CrmTrip" ADD COLUMN "signatureOrder" INTEGER;

CREATE UNIQUE INDEX "CrmTrip_signatureOrder_key" ON "CrmTrip"("signatureOrder");
