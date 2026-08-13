// The "basic performance benchmark" Unit 5.5 deliverable
// (context/implementation-map.md Unit 5.5). Not a correctness test — a
// single-request latency snapshot for the operations a real workspace
// session actually waits on, run against a live database through a
// disposable fixture this file creates and deletes itself. Run it with:
//
//   npm run perf:benchmark
//
// Lives here (a `*.test.ts` file, Vitest's own collection pattern,
// vitest.config.ts "include") rather than as a standalone `.mts` script:
// Node's native TypeScript execution cannot resolve this codebase's
// extensionless relative imports (`moduleResolution: "bundler"`,
// tsconfig.json) the way Vitest and Next.js both already do — confirmed
// directly (`ERR_MODULE_NOT_FOUND` on lib/db/client) before choosing this
// path instead of introducing a new dependency (e.g. tsx) for one script.
//
// Intentionally not a load-testing tool (no concurrency, no percentiles,
// no assertions on absolute thresholds a slower/faster database tier would
// make flaky) — "basic," per the roadmap's own wording. Each timed
// operation still gets one sanity assertion (finite, non-negative
// duration) so a real regression that throws still fails the suite; the
// printed table is the actual deliverable, read by a person.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { describe, expect, it } from "vitest";

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
const PAYLOAD_MASS = "motion.axis.payload_mass";

describe.skipIf(!liveDatabaseAvailable)(
  "performance benchmark (live database)",
  () => {
    it(
      "times the operations a real workspace session waits on",
      { timeout: 30_000 },
      async () => {
        const {
          upsertUser,
          createProject,
          createConfiguration,
          createAssembly,
          createModuleInstance,
          deleteUserAccount,
        } = await import("../lib/db/repositories/project-repository");
        const { createParameterValue } =
          await import("../lib/db/repositories/graph-repository");
        const {
          createManufacturer,
          createComponentType,
          createComponentSchemaVersion,
          createManufacturerPartRevision,
        } = await import("../lib/db/repositories/catalog-repository");
        const { createComponentAssignment } =
          await import("../lib/db/repositories/component-assignment-repository");
        const { makeQuantity } = await import("../lib/engine");
        const { executeModuleInstance } =
          await import("../lib/application/calculations/execute-module-instance");
        const { loadWorkspaceView } =
          await import("../lib/application/projects/load-workspace-view");
        const { loadBomView } =
          await import("../lib/application/reports/load-bom-view");
        const { loadMachineReportView } =
          await import("../lib/application/reports/load-machine-report-view");
        const { exportAccountData } =
          await import("../lib/application/account/export-account-data");
        const { prisma } = await import("../lib/db/client");

        const results: { readonly label: string; readonly ms: number }[] = [];
        async function time<T>(
          label: string,
          fn: () => Promise<T>,
        ): Promise<T> {
          const startedAt = performance.now();
          const result = await fn();
          const ms = performance.now() - startedAt;
          expect(ms).toBeGreaterThanOrEqual(0);
          results.push({ label, ms });
          return result;
        }

        // --- Build a disposable fixture -----------------------------------

        const user = await upsertUser(`perf-benchmark-${randomUUID()}`);
        const manufacturer = await createManufacturer({
          name: `Perf Benchmark Manufacturer ${randomUUID()}`,
        });
        const componentType = await createComponentType({
          id: `perf-benchmark-type-${randomUUID()}`,
          name: "Perf benchmark component",
        });
        const schemaVersion = await createComponentSchemaVersion({
          componentTypeId: componentType.id,
          version: "1.0.0",
          fields: [
            {
              key: "lead",
              label: "Lead",
              valueKind: "quantity",
              required: true,
              unit: "mm",
            },
          ],
        });
        const partRevision = await createManufacturerPartRevision({
          manufacturerId: manufacturer.id,
          componentTypeId: componentType.id,
          componentSchemaVersionId: schemaVersion.id,
          partNumber: "PERF-1",
          sourceRevision: "perf-benchmark",
          attributes: { lead: makeQuantity(20, "mm") },
        });

        const project = await createProject({
          ownerId: user.id,
          name: "Perf benchmark",
          marketProfileKey: "US-General-Industrial-Machinery@1",
        });
        const config = await createConfiguration({
          projectId: project.id,
          name: "Baseline",
        });
        const assembly = await createAssembly({
          configurationId: config.id,
          name: "X axis",
        });
        const moduleInstance = await createModuleInstance({
          assemblyId: assembly.id,
          configurationId: config.id,
          modulePackageId: MODULE_ID,
          moduleVersion: MODULE_VERSION,
          label: "Screw sizing",
        });
        await createParameterValue({
          configurationId: config.id,
          moduleInstanceId: moduleInstance.id,
          nodeKind: "module_input",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(10, "kg"),
        });

        // --- Time the real application-service calls ----------------------

        const runResult = await time(
          "executeModuleInstance (cold, first run)",
          () =>
            executeModuleInstance({
              moduleInstanceId: moduleInstance.id,
              ownerId: user.id,
            }),
        );
        if (!runResult.ok) {
          throw new Error(
            `Benchmark fixture run failed: ${runResult.error.message}`,
          );
        }

        await createComponentAssignment({
          configurationId: config.id,
          targetKind: "module_instance",
          moduleInstanceId: moduleInstance.id,
          partSource: "catalog",
          manufacturerPartRevisionId: partRevision.id,
          calculationRunId: runResult.run.id,
          quantity: 1,
          assignedByUserId: user.id,
        });

        await time("loadWorkspaceView (project list + full tree)", () =>
          loadWorkspaceView(user.id, project.id),
        );
        await time("loadBomView (one configuration)", () =>
          loadBomView(config.id, user.id),
        );
        await time("loadMachineReportView (whole-machine report)", () =>
          loadMachineReportView(config.id, user.id),
        );
        await time("exportAccountData (every project the user owns)", () =>
          exportAccountData(user.id),
        );

        // --- Clean up -------------------------------------------------------

        await deleteUserAccount(user.id);
        await prisma.manufacturerPartRevision.deleteMany({
          where: { id: partRevision.id },
        });
        await prisma.componentType.deleteMany({
          where: { id: componentType.id },
        });
        await prisma.manufacturer.deleteMany({
          where: { id: manufacturer.id },
        });

        // The printed table is this file's actual deliverable, not incidental debug output.
        console.log(
          "\nPerformance benchmark (single-request latency, not a load test):\n",
        );
        const widestLabel = Math.max(...results.map((r) => r.label.length));
        for (const { label, ms } of results) {
          console.log(`  ${label.padEnd(widestLabel)}  ${ms.toFixed(1)} ms`);
        }
        console.log("");
      },
    );
  },
);
