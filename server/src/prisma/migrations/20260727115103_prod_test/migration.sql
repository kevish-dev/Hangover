/*
  Warnings:

  - You are about to drop the column `basePrice` on the `Circuit` table. All the data in the column will be lost.
  - You are about to drop the column `baseTokenAmount` on the `Circuit` table. All the data in the column will be lost.
  - You are about to drop the column `galleryImages` on the `Circuit` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Circuit` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedAmount` on the `CircuitDayTask` table. All the data in the column will be lost.
  - You are about to drop the column `galleryImages` on the `Festival` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Festival` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Festival` table. All the data in the column will be lost.
  - You are about to drop the column `tokenAmount` on the `Festival` table. All the data in the column will be lost.
  - You are about to drop the column `amountArranged` on the `OperationalTask` table. All the data in the column will be lost.
  - You are about to drop the column `amountPaid` on the `OperationalTask` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedAmount` on the `OperationalTask` table. All the data in the column will be lost.
  - You are about to drop the column `galleryImages` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `tokenAmount` on the `Trip` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- DropIndex
DROP INDEX "Circuit_slug_key";

-- DropIndex
DROP INDEX "Festival_slug_key";

-- DropIndex
DROP INDEX "Trip_slug_key";

-- AlterTable
ALTER TABLE "Circuit" DROP COLUMN "basePrice",
DROP COLUMN "baseTokenAmount",
DROP COLUMN "galleryImages",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "CircuitDayTask" DROP COLUMN "estimatedAmount",
ADD COLUMN     "quantityNeeded" INTEGER,
ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Festival" DROP COLUMN "galleryImages",
DROP COLUMN "price",
DROP COLUMN "slug",
DROP COLUMN "tokenAmount";

-- AlterTable
ALTER TABLE "OperationalTask" DROP COLUMN "amountArranged",
DROP COLUMN "amountPaid",
DROP COLUMN "estimatedAmount",
ADD COLUMN     "quantityAcquired" INTEGER,
ADD COLUMN     "quantityNeeded" INTEGER,
ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "receiptNumberInt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Traveler" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "galleryImages",
DROP COLUMN "price",
DROP COLUMN "slug",
DROP COLUMN "tokenAmount";

-- CreateTable
CREATE TABLE "ItineraryDayTask" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "category" "OperationalTaskCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "unitPrice" DECIMAL(10,2),
    "quantityNeeded" INTEGER,
    "dueOffsetDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryDayTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomInvoice" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDate" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItineraryDayTask_itineraryDayId_idx" ON "ItineraryDayTask"("itineraryDayId");

-- CreateIndex
CREATE INDEX "ItineraryDayTask_category_idx" ON "ItineraryDayTask"("category");

-- CreateIndex
CREATE INDEX "CustomInvoice_status_idx" ON "CustomInvoice"("status");

-- CreateIndex
CREATE INDEX "CustomInvoice_customerEmail_idx" ON "CustomInvoice"("customerEmail");

-- AddForeignKey
ALTER TABLE "ItineraryDayTask" ADD CONSTRAINT "ItineraryDayTask_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
