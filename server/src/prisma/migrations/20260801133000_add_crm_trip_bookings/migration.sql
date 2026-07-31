-- AlterEnum
ALTER TYPE "BookingSource" ADD VALUE 'CRM';

-- AlterTable
ALTER TABLE "CrmTrip" ADD COLUMN "totalAmount" DECIMAL(10,2), ADD COLUMN "tokenAmount" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "crmTripId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_crmTripId_idx" ON "Booking"("crmTripId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_crmTripId_fkey" FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
