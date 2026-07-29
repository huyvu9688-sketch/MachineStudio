-- CreateEnum
CREATE TYPE "LoadCaseCategory" AS ENUM ('normal', 'peak', 'holding', 'emergency_stop');

-- CreateEnum
CREATE TYPE "ParameterNodeKind" AS ENUM ('machine_requirement', 'assembly_parameter', 'workflow_parameter', 'module_input', 'module_output');

-- CreateEnum
CREATE TYPE "ParameterValueSource" AS ENUM ('manual', 'workflow');

-- CreateTable
CREATE TABLE "requirements" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "assemblyId" TEXT,
    "code" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceptance_criteria" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "acceptance_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_assumptions" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "assemblyId" TEXT,
    "statement" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "design_assumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_cases" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "category" "LoadCaseCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "load_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_values" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "assemblyId" TEXT,
    "moduleInstanceId" TEXT,
    "nodeKind" "ParameterNodeKind" NOT NULL,
    "parameterId" TEXT NOT NULL,
    "loadCase" "LoadCaseCategory",
    "source" "ParameterValueSource" NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parameter_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_links" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "targetModuleInstanceId" TEXT NOT NULL,
    "targetParameterId" TEXT NOT NULL,
    "targetLoadCase" "LoadCaseCategory",
    "sourceKind" "ParameterNodeKind" NOT NULL,
    "sourceModuleInstanceId" TEXT,
    "sourceAssemblyId" TEXT,
    "sourceParameterId" TEXT NOT NULL,
    "sourceLoadCase" "LoadCaseCategory",
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parameter_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requirements_configurationId_idx" ON "requirements"("configurationId");

-- CreateIndex
CREATE INDEX "requirements_assemblyId_idx" ON "requirements"("assemblyId");

-- CreateIndex
CREATE INDEX "acceptance_criteria_requirementId_idx" ON "acceptance_criteria"("requirementId");

-- CreateIndex
CREATE INDEX "design_assumptions_configurationId_idx" ON "design_assumptions"("configurationId");

-- CreateIndex
CREATE INDEX "design_assumptions_assemblyId_idx" ON "design_assumptions"("assemblyId");

-- CreateIndex
CREATE INDEX "load_cases_configurationId_idx" ON "load_cases"("configurationId");

-- CreateIndex
CREATE INDEX "parameter_values_configurationId_idx" ON "parameter_values"("configurationId");

-- CreateIndex
CREATE INDEX "parameter_values_assemblyId_idx" ON "parameter_values"("assemblyId");

-- CreateIndex
CREATE INDEX "parameter_values_moduleInstanceId_idx" ON "parameter_values"("moduleInstanceId");

-- CreateIndex
CREATE INDEX "parameter_links_configurationId_idx" ON "parameter_links"("configurationId");

-- CreateIndex
CREATE INDEX "parameter_links_targetModuleInstanceId_idx" ON "parameter_links"("targetModuleInstanceId");

-- CreateIndex
CREATE INDEX "parameter_links_sourceModuleInstanceId_idx" ON "parameter_links"("sourceModuleInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_links_targetModuleInstanceId_targetParameterId_ta_key" ON "parameter_links"("targetModuleInstanceId", "targetParameterId", "targetLoadCase");

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_assumptions" ADD CONSTRAINT "design_assumptions_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_assumptions" ADD CONSTRAINT "design_assumptions_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_cases" ADD CONSTRAINT "load_cases_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_values" ADD CONSTRAINT "parameter_values_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_values" ADD CONSTRAINT "parameter_values_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_values" ADD CONSTRAINT "parameter_values_moduleInstanceId_fkey" FOREIGN KEY ("moduleInstanceId") REFERENCES "module_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_links" ADD CONSTRAINT "parameter_links_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_links" ADD CONSTRAINT "parameter_links_targetModuleInstanceId_fkey" FOREIGN KEY ("targetModuleInstanceId") REFERENCES "module_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_links" ADD CONSTRAINT "parameter_links_sourceModuleInstanceId_fkey" FOREIGN KEY ("sourceModuleInstanceId") REFERENCES "module_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_links" ADD CONSTRAINT "parameter_links_sourceAssemblyId_fkey" FOREIGN KEY ("sourceAssemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
