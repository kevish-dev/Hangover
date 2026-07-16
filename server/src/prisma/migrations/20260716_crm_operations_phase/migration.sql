CREATE TYPE "CrmTaskCategory" AS ENUM ('FOLLOW_UP', 'PAYMENT', 'TRAVELER_DOCUMENT', 'HOTEL', 'TRANSPORT', 'PERMIT', 'VENDOR', 'GENERAL');
CREATE TYPE "DepartureOperationStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "HotelReservationStatus" AS ENUM ('PLANNED', 'REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');
CREATE TYPE "VendorPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

ALTER TABLE "UserProfile"
  ADD COLUMN "govtIdVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "govtIdVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "govtIdVerifiedById" TEXT,
  ADD COLUMN "govtIdVerificationNotes" TEXT;

ALTER TABLE "Traveler"
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" TEXT,
  ADD COLUMN "verificationNotes" TEXT;

ALTER TABLE "BookingOpsCase"
  ADD COLUMN "hotelRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "internalNotes" TEXT;

ALTER TABLE "CrmTask"
  ALTER COLUMN "contactId" DROP NOT NULL,
  ADD COLUMN "tripId" TEXT,
  ADD COLUMN "festivalId" TEXT,
  ADD COLUMN "slotId" TEXT,
  ADD COLUMN "hotelReservationId" TEXT,
  ADD COLUMN "category" "CrmTaskCategory" NOT NULL DEFAULT 'GENERAL';

ALTER TABLE "CrmTask" DROP CONSTRAINT "CrmTask_contactId_fkey";
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DepartureOperation" (
  "id" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "status" "DepartureOperationStatus" NOT NULL DEFAULT 'PLANNING',
  "coordinatorId" TEXT,
  "notes" TEXT,
  "blockerReason" TEXT,
  "blockerResolvedAt" TIMESTAMP(3),
  "blockerResolvedById" TEXT,
  "nextActionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartureOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HotelReservation" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "hotelName" TEXT NOT NULL,
  "address" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "confirmationNumber" TEXT,
  "roomType" TEXT,
  "roomCount" INTEGER NOT NULL DEFAULT 1,
  "guestCount" INTEGER NOT NULL DEFAULT 1,
  "checkInAt" TIMESTAMP(3),
  "checkOutAt" TIMESTAMP(3),
  "status" "HotelReservationStatus" NOT NULL DEFAULT 'PLANNED',
  "estimatedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "paymentStatus" "VendorPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "paymentDueAt" TIMESTAMP(3),
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotelReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepartureOperation_slotId_key" ON "DepartureOperation"("slotId");
CREATE INDEX "DepartureOperation_status_idx" ON "DepartureOperation"("status");
CREATE INDEX "DepartureOperation_coordinatorId_idx" ON "DepartureOperation"("coordinatorId");
CREATE INDEX "DepartureOperation_nextActionAt_idx" ON "DepartureOperation"("nextActionAt");
CREATE INDEX "HotelReservation_bookingId_idx" ON "HotelReservation"("bookingId");
CREATE INDEX "HotelReservation_status_idx" ON "HotelReservation"("status");
CREATE INDEX "HotelReservation_paymentStatus_idx" ON "HotelReservation"("paymentStatus");
CREATE INDEX "HotelReservation_paymentDueAt_idx" ON "HotelReservation"("paymentDueAt");
CREATE INDEX "HotelReservation_archivedAt_idx" ON "HotelReservation"("archivedAt");
CREATE INDEX "CrmTask_tripId_idx" ON "CrmTask"("tripId");
CREATE INDEX "CrmTask_festivalId_idx" ON "CrmTask"("festivalId");
CREATE INDEX "CrmTask_slotId_idx" ON "CrmTask"("slotId");
CREATE INDEX "CrmTask_hotelReservationId_idx" ON "CrmTask"("hotelReservationId");
CREATE INDEX "CrmTask_category_idx" ON "CrmTask"("category");

ALTER TABLE "DepartureOperation" ADD CONSTRAINT "DepartureOperation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotelReservation" ADD CONSTRAINT "HotelReservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_hotelReservationId_fkey" FOREIGN KEY ("hotelReservationId") REFERENCES "HotelReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
