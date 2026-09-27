-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" UUID NOT NULL,
    "callId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- Prisma Schema Language cannot express CHECK constraints. Require a non-whitespace title.
ALTER TABLE "WorkOrder"
ADD CONSTRAINT "WorkOrder_title_not_blank_check"
CHECK ("title" ~ '[^[:space:]]');

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_callId_key" ON "WorkOrder"("callId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
