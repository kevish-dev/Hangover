-- AlterTable
ALTER TABLE "CrmTrip" ADD COLUMN IF NOT EXISTS "operationsReminderDays" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "CrmTripSlot" ADD COLUMN IF NOT EXISTS "filledSpots" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "crmTripSlotId" TEXT;

-- AlterTable
ALTER TABLE "OperationalTask" ADD COLUMN IF NOT EXISTS "crmItineraryDayId" TEXT;
ALTER TABLE "OperationalTask" ADD COLUMN IF NOT EXISTS "crmSourceKey" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_crmTripSlotId_idx" ON "Booking"("crmTripSlotId");
CREATE INDEX IF NOT EXISTS "OperationalTask_crmItineraryDayId_idx" ON "OperationalTask"("crmItineraryDayId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_crmTripSlotId_fkey"
  FOREIGN KEY ("crmTripSlotId") REFERENCES "CrmTripSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_crmItineraryDayId_fkey"
  FOREIGN KEY ("crmItineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
