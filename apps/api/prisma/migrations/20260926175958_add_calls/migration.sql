-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('AI_RESOLVED', 'HUMAN_ACTION_REQUIRED', 'TRANSFERRED', 'INCOMPLETE');

-- CreateTable
CREATE TABLE "Call" (
    "id" UUID NOT NULL,
    "callerReference" TEXT,
    "category" TEXT,
    "outcome" "CallOutcome",
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- Prisma Schema Language does not express CHECK constraints; keep this invariant in PostgreSQL.
ALTER TABLE "Call"
ADD CONSTRAINT "Call_endedAt_not_before_startedAt_check"
CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

-- CreateIndex
CREATE INDEX "Call_startedAt_id_idx" ON "Call"("startedAt" DESC, "id" DESC);
