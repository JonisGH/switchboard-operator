-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "aiSuggestion" JSONB,
ADD COLUMN     "simulationScenarioKey" TEXT,
ADD COLUMN     "transcript" TEXT;
