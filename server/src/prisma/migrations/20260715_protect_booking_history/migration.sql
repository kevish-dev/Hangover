-- Preserve booking and payment history when admins edit or delete catalog data.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_packageId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_slotId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_tripId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_festivalId_fkey";

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "Package"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_slotId_fkey"
  FOREIGN KEY ("slotId") REFERENCES "Slot"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "Festival"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
