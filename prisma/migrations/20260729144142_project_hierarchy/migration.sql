-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('draft', 'active', 'completed', 'abandoned');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_projects" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketProfileKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "machine_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_configurations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "machine_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assemblies" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assemblies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowVersion" TEXT NOT NULL,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_instances" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "workflowInstanceId" TEXT,
    "modulePackageId" TEXT NOT NULL,
    "moduleVersion" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "module_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machine_projects_ownerId_idx" ON "machine_projects"("ownerId");

-- CreateIndex
CREATE INDEX "machine_configurations_projectId_idx" ON "machine_configurations"("projectId");

-- CreateIndex
CREATE INDEX "assemblies_configurationId_idx" ON "assemblies"("configurationId");

-- CreateIndex
CREATE INDEX "assemblies_parentId_idx" ON "assemblies"("parentId");

-- CreateIndex
CREATE INDEX "workflow_instances_configurationId_idx" ON "workflow_instances"("configurationId");

-- CreateIndex
CREATE INDEX "module_instances_assemblyId_idx" ON "module_instances"("assemblyId");

-- CreateIndex
CREATE INDEX "module_instances_workflowInstanceId_idx" ON "module_instances"("workflowInstanceId");

-- AddForeignKey
ALTER TABLE "machine_projects" ADD CONSTRAINT "machine_projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_configurations" ADD CONSTRAINT "machine_configurations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "machine_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assemblies" ADD CONSTRAINT "assemblies_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assemblies" ADD CONSTRAINT "assemblies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_instances" ADD CONSTRAINT "module_instances_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_instances" ADD CONSTRAINT "module_instances_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
