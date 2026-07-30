-- AlterTable
ALTER TABLE "module_instances" ADD COLUMN     "lastCalculationRunId" TEXT,
ADD COLUMN     "lastRunStatus" "CheckStatus";

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_instances_lastRunStatus_idx" ON "module_instances"("lastRunStatus");

-- CreateIndex
CREATE INDEX "audit_events_projectId_idx" ON "audit_events"("projectId");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "machine_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
