DO $$ BEGIN
  CREATE TYPE "BookingSource" AS ENUM ('CATALOG', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "CustomTripStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'CONVERTED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "source" "BookingSource" NOT NULL DEFAULT 'CATALOG',
  ADD COLUMN IF NOT EXISTS "customTripId" TEXT,
  ADD COLUMN IF NOT EXISTS "customTripSnapshot" JSONB,
  ALTER COLUMN "slotId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "CustomTrip" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerUserId" TEXT,
  "createdById" TEXT NOT NULL,
  "bannerImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "highlights" JSONB NOT NULL DEFAULT '[]',
  "itinerary" JSONB NOT NULL DEFAULT '[]',
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "travelerCount" INTEGER NOT NULL,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "tokenAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "balanceDueDate" DATE,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "pricingNotes" TEXT,
  "internalNotes" TEXT,
  "status" "CustomTripStatus" NOT NULL DEFAULT 'DRAFT',
  "shareTokenHash" TEXT,
  "sentAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomTrip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomTrip_reference_key" ON "CustomTrip"("reference");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomTrip_shareTokenHash_key" ON "CustomTrip"("shareTokenHash");
CREATE INDEX IF NOT EXISTS "CustomTrip_customerEmail_idx" ON "CustomTrip"("customerEmail");
CREATE INDEX IF NOT EXISTS "CustomTrip_customerUserId_idx" ON "CustomTrip"("customerUserId");
CREATE INDEX IF NOT EXISTS "CustomTrip_createdById_idx" ON "CustomTrip"("createdById");
CREATE INDEX IF NOT EXISTS "CustomTrip_status_idx" ON "CustomTrip"("status");
CREATE INDEX IF NOT EXISTS "CustomTrip_startDate_idx" ON "CustomTrip"("startDate");
CREATE INDEX IF NOT EXISTS "CustomTrip_createdAt_idx" ON "CustomTrip"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_customTripId_key" ON "Booking"("customTripId");
CREATE INDEX IF NOT EXISTS "Booking_customTripId_idx" ON "Booking"("customTripId");
CREATE INDEX IF NOT EXISTS "Booking_source_idx" ON "Booking"("source");

DO $$ BEGIN
  ALTER TABLE "CustomTrip" ADD CONSTRAINT "CustomTrip_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CustomTrip" ADD CONSTRAINT "CustomTrip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customTripId_fkey" FOREIGN KEY ("customTripId") REFERENCES "CustomTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_source_integrity_check" CHECK (
    ("source" = 'CATALOG' AND "slotId" IS NOT NULL AND "customTripId" IS NULL)
    OR
    ("source" = 'CUSTOM' AND "slotId" IS NULL AND "customTripId" IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TABLE "CustomTrip" ADD CONSTRAINT "CustomTrip_date_check" CHECK ("endDate" >= "startDate"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CustomTrip" ADD CONSTRAINT "CustomTrip_duration_check" CHECK ("durationDays" > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CustomTrip" ADD CONSTRAINT "CustomTrip_traveler_count_check" CHECK ("travelerCount" > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CustomTrip" ADD CONSTRAINT "CustomTrip_amount_check" CHECK ("totalAmount" > 0 AND "tokenAmount" >= 0 AND "tokenAmount" <= "totalAmount"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Review exists in the application schema but was missing from the historical migration chain.
-- Create it only where necessary so clean installs and drifted existing databases both converge.
CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "userId" TEXT NOT NULL,
  "tripId" TEXT,
  "festivalId" TEXT,
  "customTripId" TEXT,
  "bookingId" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "customTripId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Review_bookingId_key" ON "Review"("bookingId");
CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "Review"("userId");
CREATE INDEX IF NOT EXISTS "Review_tripId_idx" ON "Review"("tripId");
CREATE INDEX IF NOT EXISTS "Review_festivalId_idx" ON "Review"("festivalId");
CREATE INDEX IF NOT EXISTS "Review_customTripId_idx" ON "Review"("customTripId");
CREATE INDEX IF NOT EXISTS "Review_isPublished_idx" ON "Review"("isPublished");
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_customTripId_fkey" FOREIGN KEY ("customTripId") REFERENCES "CustomTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
