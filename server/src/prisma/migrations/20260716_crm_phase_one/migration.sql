CREATE TYPE "CrmLeadSource" AS ENUM ('WEBSITE', 'PHONE', 'WHATSAPP', 'REFERRAL', 'WALK_IN', 'MANUAL');
CREATE TYPE "CrmLeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT', 'CONVERTED', 'LOST');
CREATE TYPE "CrmActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'STATUS_CHANGE', 'TASK_EVENT', 'SYSTEM');
CREATE TYPE "CrmTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

CREATE TABLE "CrmContact" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "displayName" TEXT NOT NULL,
  "email" TEXT,
  "normalizedEmail" TEXT,
  "phone" TEXT,
  "normalizedPhone" TEXT,
  "source" "CrmLeadSource" NOT NULL DEFAULT 'WEBSITE',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmLead" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "inquiryId" TEXT,
  "bookingId" TEXT,
  "tripId" TEXT,
  "festivalId" TEXT,
  "tripType" "TripType",
  "source" "CrmLeadSource" NOT NULL DEFAULT 'WEBSITE',
  "stage" "CrmLeadStage" NOT NULL DEFAULT 'NEW',
  "title" TEXT,
  "details" TEXT,
  "ownerId" TEXT,
  "createdById" TEXT,
  "nextFollowUpAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "lostReason" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmActivity" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "leadId" TEXT,
  "bookingId" TEXT,
  "type" "CrmActivityType" NOT NULL,
  "summary" TEXT NOT NULL,
  "details" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmTask" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "leadId" TEXT,
  "bookingId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "CrmTaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "CrmTaskStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "assigneeId" TEXT,
  "createdById" TEXT,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingOpsCase" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "coordinatorId" TEXT,
  "documentsVerifiedAt" TIMESTAMP(3),
  "documentsVerifiedById" TEXT,
  "specialRequestsReviewedAt" TIMESTAMP(3),
  "specialRequestsReviewedById" TEXT,
  "blockerReason" TEXT,
  "blockerResolvedAt" TIMESTAMP(3),
  "blockerResolvedById" TEXT,
  "nextActionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingOpsCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmContact_userId_key" ON "CrmContact"("userId");
CREATE UNIQUE INDEX "CrmContact_normalizedEmail_key" ON "CrmContact"("normalizedEmail");
CREATE INDEX "CrmContact_normalizedPhone_idx" ON "CrmContact"("normalizedPhone");
CREATE INDEX "CrmContact_source_idx" ON "CrmContact"("source");
CREATE INDEX "CrmContact_archivedAt_idx" ON "CrmContact"("archivedAt");
CREATE INDEX "CrmContact_createdAt_idx" ON "CrmContact"("createdAt");

CREATE UNIQUE INDEX "CrmLead_inquiryId_key" ON "CrmLead"("inquiryId");
CREATE UNIQUE INDEX "CrmLead_bookingId_key" ON "CrmLead"("bookingId");
CREATE INDEX "CrmLead_contactId_idx" ON "CrmLead"("contactId");
CREATE INDEX "CrmLead_stage_idx" ON "CrmLead"("stage");
CREATE INDEX "CrmLead_source_idx" ON "CrmLead"("source");
CREATE INDEX "CrmLead_ownerId_idx" ON "CrmLead"("ownerId");
CREATE INDEX "CrmLead_nextFollowUpAt_idx" ON "CrmLead"("nextFollowUpAt");
CREATE INDEX "CrmLead_archivedAt_idx" ON "CrmLead"("archivedAt");
CREATE INDEX "CrmLead_createdAt_idx" ON "CrmLead"("createdAt");
CREATE INDEX "CrmLead_tripId_idx" ON "CrmLead"("tripId");
CREATE INDEX "CrmLead_festivalId_idx" ON "CrmLead"("festivalId");

CREATE INDEX "CrmActivity_contactId_createdAt_idx" ON "CrmActivity"("contactId", "createdAt");
CREATE INDEX "CrmActivity_leadId_idx" ON "CrmActivity"("leadId");
CREATE INDEX "CrmActivity_bookingId_idx" ON "CrmActivity"("bookingId");
CREATE INDEX "CrmActivity_type_idx" ON "CrmActivity"("type");
CREATE INDEX "CrmActivity_createdById_idx" ON "CrmActivity"("createdById");

CREATE INDEX "CrmTask_contactId_idx" ON "CrmTask"("contactId");
CREATE INDEX "CrmTask_leadId_idx" ON "CrmTask"("leadId");
CREATE INDEX "CrmTask_bookingId_idx" ON "CrmTask"("bookingId");
CREATE INDEX "CrmTask_status_dueAt_idx" ON "CrmTask"("status", "dueAt");
CREATE INDEX "CrmTask_assigneeId_idx" ON "CrmTask"("assigneeId");
CREATE INDEX "CrmTask_archivedAt_idx" ON "CrmTask"("archivedAt");

CREATE UNIQUE INDEX "BookingOpsCase_bookingId_key" ON "BookingOpsCase"("bookingId");
CREATE INDEX "BookingOpsCase_coordinatorId_idx" ON "BookingOpsCase"("coordinatorId");
CREATE INDEX "BookingOpsCase_nextActionAt_idx" ON "BookingOpsCase"("nextActionAt");
CREATE INDEX "BookingOpsCase_blockerResolvedAt_idx" ON "BookingOpsCase"("blockerResolvedAt");

ALTER TABLE "CrmContact"
  ADD CONSTRAINT "CrmContact_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmLead"
  ADD CONSTRAINT "CrmLead_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmLead"
  ADD CONSTRAINT "CrmLead_inquiryId_fkey"
  FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmLead"
  ADD CONSTRAINT "CrmLead_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmLead"
  ADD CONSTRAINT "CrmLead_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmLead"
  ADD CONSTRAINT "CrmLead_festivalId_fkey"
  FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmActivity"
  ADD CONSTRAINT "CrmActivity_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity"
  ADD CONSTRAINT "CrmActivity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmActivity"
  ADD CONSTRAINT "CrmActivity_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmTask"
  ADD CONSTRAINT "CrmTask_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTask"
  ADD CONSTRAINT "CrmTask_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmTask"
  ADD CONSTRAINT "CrmTask_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookingOpsCase"
  ADD CONSTRAINT "BookingOpsCase_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
