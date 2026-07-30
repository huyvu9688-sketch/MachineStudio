-- CreateTable
CREATE TABLE "machine_baselines" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machine_baselines_configurationId_idx" ON "machine_baselines"("configurationId");

-- AddForeignKey
ALTER TABLE "machine_baselines" ADD CONSTRAINT "machine_baselines_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "machine_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Immutability guard (Unit 2.9): a machine baseline has no legitimate
-- mutation path at all (invariant "Baseline immutability" — unlike
-- calculation_runs, not even a stale flag may change). Any UPDATE is
-- rejected outright, backing up the repository's no-update-path service rule
-- (context/code-standards.md: "Immutable records are protected by service
-- rules and database constraints where practical").
CREATE OR REPLACE FUNCTION "machine_baselines_immutable_guard"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'machine_baselines rows are immutable (baseline %)', OLD."id";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "machine_baselines_immutable_guard"
  BEFORE UPDATE ON "machine_baselines"
  FOR EACH ROW EXECUTE FUNCTION "machine_baselines_immutable_guard"();
