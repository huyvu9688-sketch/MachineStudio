-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('pass', 'fail', 'warning', 'not_applicable', 'invalid_input');

-- CreateTable
CREATE TABLE "calculation_runs" (
    "id" TEXT NOT NULL,
    "moduleInstanceId" TEXT NOT NULL,
    "engineSdkVersion" TEXT NOT NULL,
    "modulePackageId" TEXT NOT NULL,
    "moduleVersion" TEXT NOT NULL,
    "modulePackageHash" TEXT NOT NULL,
    "parameterRegistryVersion" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "criticalMargin" DOUBLE PRECISION,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "staleReason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "calculation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calculation_runs_moduleInstanceId_idx" ON "calculation_runs"("moduleInstanceId");

-- CreateIndex
CREATE INDEX "calculation_runs_stale_idx" ON "calculation_runs"("stale");

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_moduleInstanceId_fkey" FOREIGN KEY ("moduleInstanceId") REFERENCES "module_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Immutability guard (Unit 2.3): a calculation run's engineering snapshot is
-- write-once (invariant "Immutable runs"). Only stale state (stale, staleReason)
-- and updatedAt may change on UPDATE; any change to identity, version pins, the
-- derived summaries, attribution, createdAt, or the snapshot payload is rejected
-- at the database, backing up the repository's no-update-path service rule
-- (context/code-standards.md: "Immutable records are protected by service rules
-- and database constraints where practical").
CREATE OR REPLACE FUNCTION "calculation_runs_immutable_guard"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."moduleInstanceId" IS DISTINCT FROM OLD."moduleInstanceId"
     OR NEW."engineSdkVersion" IS DISTINCT FROM OLD."engineSdkVersion"
     OR NEW."modulePackageId" IS DISTINCT FROM OLD."modulePackageId"
     OR NEW."moduleVersion" IS DISTINCT FROM OLD."moduleVersion"
     OR NEW."modulePackageHash" IS DISTINCT FROM OLD."modulePackageHash"
     OR NEW."parameterRegistryVersion" IS DISTINCT FROM OLD."parameterRegistryVersion"
     OR NEW."status" IS DISTINCT FROM OLD."status"
     OR NEW."criticalMargin" IS DISTINCT FROM OLD."criticalMargin"
     OR NEW."createdByUserId" IS DISTINCT FROM OLD."createdByUserId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR NEW."snapshot" IS DISTINCT FROM OLD."snapshot" THEN
    RAISE EXCEPTION 'calculation_runs is immutable except stale state (run %)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "calculation_runs_immutable_guard"
  BEFORE UPDATE ON "calculation_runs"
  FOR EACH ROW EXECUTE FUNCTION "calculation_runs_immutable_guard"();
