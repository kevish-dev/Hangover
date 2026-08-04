-- Keep one auditable invoice/receipt record for every successfully delivered
-- booking receipt, alongside manually raised custom receipts.
CREATE TYPE "InvoiceSource" AS ENUM ('CUSTOM', 'BOOKING_RECEIPT');

ALTER TABLE "CustomInvoice"
  ADD COLUMN "source" "InvoiceSource" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN "bookingId" TEXT,
  ADD COLUMN "paymentId" TEXT,
  ADD COLUMN "sentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CustomInvoice_paymentId_key" ON "CustomInvoice"("paymentId");
CREATE INDEX "CustomInvoice_source_idx" ON "CustomInvoice"("source");
CREATE INDEX "CustomInvoice_bookingId_idx" ON "CustomInvoice"("bookingId");
