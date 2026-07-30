-- CreateEnum
CREATE TYPE "ComponentAssignmentTargetKind" AS ENUM ('module_instance', 'assembly');

-- CreateEnum
CREATE TYPE "ComponentAssignmentPartSource" AS ENUM ('catalog', 'manual');

-- CreateTable
CREATE TABLE "component_assignments" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "targetKind" "ComponentAssignmentTargetKind" NOT NULL,
    "moduleInstanceId" TEXT,
    "assemblyId" TEXT,
    "partSource" "ComponentAssignmentPartSource" NOT NULL,
    "manufacturerPartRevisionId" TEXT,
    "manualPartDetails" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "calculationRunId" TEXT,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "staleReason" TEXT,
    "assignedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "component_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "component_assignments_configurationId_idx" ON "component_assignments"("configurationId");

-- CreateIndex
CREATE INDEX "component_assignments_moduleInstanceId_idx" ON "component_assignments"("moduleInstanceId");

-- CreateIndex
CREATE INDEX "component_assignments_assemblyId_idx" ON "component_assignments"("assemblyId");

-- CreateIndex
CREATE INDEX "component_assignments_manufacturerPartRevisionId_idx" ON "component_assignments"("manufacturerPartRevisionId");

-- CreateIndex
CREATE INDEX "component_assignments_calculationRunId_idx" ON "component_assignments"("calculationRunId");

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_moduleInstanceId_fkey" FOREIGN KEY ("moduleInstanceId") REFERENCES "module_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_manufacturerPartRevisionId_fkey" FOREIGN KEY ("manufacturerPartRevisionId") REFERENCES "manufacturer_part_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "calculation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
