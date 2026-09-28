-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('OPERATIONS_REMINDER', 'NEW_INQUIRY');

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationRecipient_category_idx" ON "NotificationRecipient"("category");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_category_userId_key" ON "NotificationRecipient"("category", "userId");

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
