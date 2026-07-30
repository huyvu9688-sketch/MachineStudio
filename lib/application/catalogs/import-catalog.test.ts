// Live-database tests for the `importCatalog` application service (Unit 2.7
// part 2). Real PostgreSQL round trips; skips when the generated Prisma
// client is absent (see context/progress-tracker.md).
//
// Proves the Unit 2.7 exit criterion end to end: a manufacturer catalog
// fixture imports reproducibly (re-running it updates rows in place rather
// than duplicating or erroring) and reports every rejected row — part 1
// (`csv-import.test.ts`) already proves the parsing/reporting half in
// isolation; this file proves the "imports reproducibly" half against a real
// database, plus the service's setup-validation error paths.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type {
  ComponentAttributeFieldDefinition,
  ImportMapping,
} from "../../catalog";
import type {
  ComponentSchemaVersionId,
  ComponentTypeId,
  ManufacturerId,
} from "../../db/repositories/catalog-types";

const here = dirname(fileURLToPath(import.meta.url));
const generatedClientAvailable = existsSync(
  join(here, "..", "..", "db", "generated", "prisma"),
);

const ballScrewFields: ComponentAttributeFieldDefinition[] = [
  {
    key: "lead",
    label: "Lead",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "diameter",
    label: "Diameter",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
];

const csvHeader = "Part Number,Revision,Lead (mm),Diameter (mm)";

describe.skipIf(!generatedClientAvailable)(
  "importCatalog (live database)",
  () => {
    let application: typeof import("./import-catalog");
    let catalog: typeof import("../../db/repositories/catalog-repository");
    let client: typeof import("../../db/client");
    const createdManufacturerIds: string[] = [];
    const createdComponentTypeIds: string[] = [];
    const createdImportBatchIds: string[] = [];

    interface Scaffold {
      readonly manufacturerId: ManufacturerId;
      readonly componentTypeId: ComponentTypeId;
      readonly schemaVersionId: ComponentSchemaVersionId;
      readonly mapping: ImportMapping;
    }

    async function scaffold(): Promise<Scaffold> {
      const manufacturer = await catalog.createManufacturer({
        name: `Test Manufacturer ${randomUUID()}`,
      });
      createdManufacturerIds.push(manufacturer.id);
      const componentType = await catalog.createComponentType({
        id: `ball-screw-${randomUUID()}`,
        name: "Ball Screw",
      });
      createdComponentTypeIds.push(componentType.id);
      const schemaVersion = await catalog.createComponentSchemaVersion({
        componentTypeId: componentType.id,
        version: "1.0.0",
        fields: ballScrewFields,
      });
      const mapping: ImportMapping = {
        id: "ball-screw-basic",
        version: "1.0.0",
        componentTypeId: componentType.id,
        componentSchemaVersionId: schemaVersion.id,
        fields: [
          {
            target: "partNumber",
            source: { kind: "column", column: "Part Number" },
          },
          {
            target: "sourceRevision",
            source: { kind: "column", column: "Revision" },
          },
          {
            target: "lead",
            source: { kind: "column", column: "Lead (mm)" },
            sourceUnit: "mm",
          },
          {
            target: "diameter",
            source: { kind: "column", column: "Diameter (mm)" },
            sourceUnit: "mm",
          },
        ],
      };
      return {
        manufacturerId: manufacturer.id,
        componentTypeId: componentType.id,
        schemaVersionId: schemaVersion.id,
        mapping,
      };
    }

    beforeAll(async () => {
      application = await import("./import-catalog");
      catalog = await import("../../db/repositories/catalog-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      const manufacturerIds = createdManufacturerIds.splice(0);
      if (manufacturerIds.length > 0) {
        await client.prisma.manufacturerPartRevision.deleteMany({
          where: { manufacturerId: { in: manufacturerIds } },
        });
      }
      const batchIds = createdImportBatchIds.splice(0);
      if (batchIds.length > 0) {
        await client.prisma.catalogImportBatch.deleteMany({
          where: { id: { in: batchIds } },
        });
      }
      const componentTypeIds = createdComponentTypeIds.splice(0);
      if (componentTypeIds.length > 0) {
        await client.prisma.componentType.deleteMany({
          where: { id: { in: componentTypeIds } },
        });
      }
      if (manufacturerIds.length > 0) {
        await client.prisma.manufacturer.deleteMany({
          where: { id: { in: manufacturerIds } },
        });
      }
    });

    it("imports every valid row and reports every rejected row", async () => {
      const s = await scaffold();
      const csv =
        csvHeader +
        "\n" +
        "BSS1520-914,2026-catalog,20,15\n" + // valid
        "BSS1520-915,2026-catalog,not-a-number,15\n" + // invalid
        "BSS1520-916,2026-catalog,25,16\n"; // valid

      const result = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: s.mapping,
        csvText: csv,
        sourceLabel: "test-catalog.csv",
      });

      expect(result.ok).toBe(true);
      if (!result.ok || result.dryRun)
        throw new Error("expected an applied result");
      createdImportBatchIds.push(result.batchId);

      expect(result.totalRows).toBe(3);
      expect(result.validRowCount).toBe(2);
      expect(result.invalidRowCount).toBe(1);
      expect(result.persistedCount).toBe(2);
      expect(result.rows[1]?.ok).toBe(false);
      expect(result.rows[1]?.errors).toContainEqual({
        target: "lead",
        message: 'invalid numeric value: "not-a-number"',
      });

      const persisted =
        await catalog.listManufacturerPartRevisionsByComponentType(
          s.componentTypeId,
        );
      expect(persisted).toHaveLength(2);
      expect(persisted.map((r) => r.partNumber).sort()).toEqual([
        "BSS1520-914",
        "BSS1520-916",
      ]);

      const batch = await catalog.loadCatalogImportBatch(result.batchId);
      expect(batch?.totalRowCount).toBe(3);
      expect(batch?.validRowCount).toBe(2);
      expect(batch?.invalidRowCount).toBe(1);
      expect(batch?.importMappingId).toBe("ball-screw-basic");
      expect(batch?.importMappingVersion).toBe("1.0.0");
    });

    it("imports reproducibly: re-running the same file updates rows in place, not duplicates", async () => {
      const s = await scaffold();
      const csv = csvHeader + "\n" + "BSS1520-914,2026-catalog,20,15\n";
      const revisedCsv = csvHeader + "\n" + "BSS1520-914,2026-catalog,22,15\n";

      const firstRun = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: s.mapping,
        csvText: csv,
        sourceLabel: "test-catalog.csv",
      });
      if (!firstRun.ok || firstRun.dryRun)
        throw new Error("expected an applied result");
      createdImportBatchIds.push(firstRun.batchId);

      const secondRun = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: s.mapping,
        csvText: revisedCsv,
        sourceLabel: "test-catalog-corrected.csv",
      });
      if (!secondRun.ok || secondRun.dryRun)
        throw new Error("expected an applied result");
      createdImportBatchIds.push(secondRun.batchId);

      expect(secondRun.batchId).not.toBe(firstRun.batchId);

      const persisted =
        await catalog.listManufacturerPartRevisionsByComponentType(
          s.componentTypeId,
        );
      expect(persisted).toHaveLength(1);
      expect(persisted[0]?.attributes.lead).toMatchObject({ value: 22 });
      expect(persisted[0]?.importBatchId).toBe(secondRun.batchId);
    });

    it("dry run parses and validates without writing anything", async () => {
      const s = await scaffold();
      const csv = csvHeader + "\n" + "BSS1520-914,2026-catalog,20,15\n";

      const result = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: s.mapping,
        csvText: csv,
        sourceLabel: "test-catalog.csv",
        dryRun: true,
      });

      expect(result.ok).toBe(true);
      if (!result.ok || !result.dryRun)
        throw new Error("expected a dry-run result");
      expect(result.validRowCount).toBe(1);

      const persisted =
        await catalog.listManufacturerPartRevisionsByComponentType(
          s.componentTypeId,
        );
      expect(persisted).toHaveLength(0);
    });

    it("returns manufacturer_not_found for an unknown manufacturer", async () => {
      const s = await scaffold();
      const result = await application.importCatalog({
        manufacturerId: asManufacturerId("does-not-exist"),
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: s.mapping,
        csvText: csvHeader + "\n",
        sourceLabel: "test-catalog.csv",
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected a failure");
      expect(result.error.code).toBe("manufacturer_not_found");
    });

    it("returns component_schema_version_not_found for an unknown schema version", async () => {
      const s = await scaffold();
      const result = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: asComponentSchemaVersionId("does-not-exist"),
        mapping: s.mapping,
        csvText: csvHeader + "\n",
        sourceLabel: "test-catalog.csv",
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected a failure");
      expect(result.error.code).toBe("component_schema_version_not_found");
    });

    it("returns component_type_mismatch when componentTypeId does not match the schema version's own type", async () => {
      const s = await scaffold();
      const otherType = await catalog.createComponentType({
        id: `other-type-${randomUUID()}`,
        name: "Other",
      });
      createdComponentTypeIds.push(otherType.id);

      const result = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: otherType.id,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: { ...s.mapping, componentTypeId: otherType.id },
        csvText: csvHeader + "\n",
        sourceLabel: "test-catalog.csv",
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected a failure");
      expect(result.error.code).toBe("component_type_mismatch");
    });

    it("returns mapping_mismatch when the mapping targets a different schema version", async () => {
      const s = await scaffold();
      const result = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: {
          ...s.mapping,
          componentSchemaVersionId: "some-other-version",
        },
        csvText: csvHeader + "\n",
        sourceLabel: "test-catalog.csv",
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected a failure");
      expect(result.error.code).toBe("mapping_mismatch");
    });

    it("returns invalid_csv_setup when the CSV has no header row", async () => {
      const s = await scaffold();
      const result = await application.importCatalog({
        manufacturerId: s.manufacturerId,
        componentTypeId: s.componentTypeId,
        componentSchemaVersionId: s.schemaVersionId,
        mapping: s.mapping,
        csvText: "",
        sourceLabel: "test-catalog.csv",
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected a failure");
      expect(result.error.code).toBe("invalid_csv_setup");
    });
  },
);

function asManufacturerId(id: string): ManufacturerId {
  return id as ManufacturerId;
}
function asComponentSchemaVersionId(id: string): ComponentSchemaVersionId {
  return id as ComponentSchemaVersionId;
}
