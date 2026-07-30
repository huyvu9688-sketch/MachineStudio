// Live-database tests for the manufacturer-catalog repository (Unit 2.6).
//
// Real PostgreSQL round trips; skips when the generated Prisma client is
// absent (see context/progress-tracker.md). Covers the Unit 2.6 plan: JSONB
// validation on write and read for both `ComponentSchemaVersion.fields` and
// `ManufacturerPartRevision.attributes`, the idempotency-supporting unique
// identity, cascade/restrict delete behavior, and the unit's exit criterion —
// two component types with different attributes coexisting without a Prisma
// schema change.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "../../engine/values";
import type { Quantity } from "../../engine/values";
import type { ComponentAttributeFieldDefinition } from "../../catalog";
import type {
  ComponentSchemaVersionId,
  ComponentTypeId,
  ManufacturerId,
} from "./catalog-types";

const here = dirname(fileURLToPath(import.meta.url));
const generatedClientAvailable = existsSync(join(here, "..", "generated", "prisma"));

function quantity(value: number, unit: string): Quantity {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value, unit };
}

const ballScrewFields: ComponentAttributeFieldDefinition[] = [
  { key: "lead", label: "Lead", valueKind: "quantity", required: true, unit: "mm" },
  { key: "diameter", label: "Diameter", valueKind: "quantity", required: true, unit: "mm" },
];

const servoMotorFields: ComponentAttributeFieldDefinition[] = [
  {
    key: "ratedTorque",
    label: "Rated Torque",
    valueKind: "quantity",
    required: true,
    unit: "N*m",
  },
  { key: "ratedSpeed", label: "Rated Speed", valueKind: "quantity", required: true, unit: "rpm" },
];

describe.skipIf(!generatedClientAvailable)(
  "catalog-repository (live database)",
  () => {
    let catalog: typeof import("./catalog-repository");
    let client: typeof import("../client");
    const createdPartRevisionIds: string[] = [];
    const createdImportBatchIds: string[] = [];
    const createdComponentTypeIds: string[] = [];
    const createdManufacturerIds: string[] = [];

    async function newManufacturer(): Promise<ManufacturerId> {
      const manufacturer = await catalog.createManufacturer({
        name: `Test Manufacturer ${randomUUID()}`,
      });
      createdManufacturerIds.push(manufacturer.id);
      return manufacturer.id;
    }

    async function newComponentType(
      slug: string,
      fields: ComponentAttributeFieldDefinition[],
    ): Promise<{
      componentTypeId: ComponentTypeId;
      schemaVersionId: ComponentSchemaVersionId;
    }> {
      const componentType = await catalog.createComponentType({
        id: `${slug}-${randomUUID()}`,
        name: slug,
      });
      createdComponentTypeIds.push(componentType.id);
      const schemaVersion = await catalog.createComponentSchemaVersion({
        componentTypeId: componentType.id,
        version: "1.0.0",
        fields,
      });
      return { componentTypeId: componentType.id, schemaVersionId: schemaVersion.id };
    }

    beforeAll(async () => {
      catalog = await import("./catalog-repository");
      client = await import("../client");
    });

    afterEach(async () => {
      if (createdPartRevisionIds.length > 0) {
        await client.prisma.manufacturerPartRevision.deleteMany({
          where: { id: { in: createdPartRevisionIds.splice(0) } },
        });
      }
      if (createdImportBatchIds.length > 0) {
        await client.prisma.catalogImportBatch.deleteMany({
          where: { id: { in: createdImportBatchIds.splice(0) } },
        });
      }
      if (createdComponentTypeIds.length > 0) {
        // Cascades away each type's ComponentSchemaVersion rows.
        await client.prisma.componentType.deleteMany({
          where: { id: { in: createdComponentTypeIds.splice(0) } },
        });
      }
      if (createdManufacturerIds.length > 0) {
        await client.prisma.manufacturer.deleteMany({
          where: { id: { in: createdManufacturerIds.splice(0) } },
        });
      }
    });

    it("creates a manufacturer and loads it back", async () => {
      const manufacturerId = await newManufacturer();
      const loaded = await catalog.loadManufacturer(manufacturerId);
      expect(loaded?.id).toBe(manufacturerId);
    });

    it("creates a component type, schema version, and part revision whose attributes round-trip", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );

      const revision = await catalog.createManufacturerPartRevision({
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm"), diameter: quantity(15, "mm") },
      });
      createdPartRevisionIds.push(revision.id);

      const loaded = await catalog.loadManufacturerPartRevision(revision.id);
      expect(loaded?.attributes).toEqual({
        lead: quantity(20, "mm"),
        diameter: quantity(15, "mm"),
      });
      expect(loaded?.dataQualityStatus).toBe("valid");
      expect(loaded?.lifecycleStatus).toBeNull();

      const loadedSchemaVersion = await catalog.loadComponentSchemaVersion(schemaVersionId);
      expect(loadedSchemaVersion?.fields).toEqual(ballScrewFields);
    });

    it("creates a catalog import batch and loads it back", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId } = await newComponentType("ball-screw", ballScrewFields);

      const batch = await catalog.createCatalogImportBatch({
        componentTypeId,
        manufacturerId,
        sourceLabel: "2026-07 ball screw catalog.csv",
      });
      createdImportBatchIds.push(batch.id);

      const loaded = await catalog.loadCatalogImportBatch(batch.id);
      expect(loaded?.componentTypeId).toBe(componentTypeId);
      expect(loaded?.manufacturerId).toBe(manufacturerId);
      expect(loaded?.sourceLabel).toBe("2026-07 ball screw catalog.csv");
      expect(loaded?.importedByUserId).toBeNull();
    });

    it("lets two component types with different attributes coexist without a Prisma schema change", async () => {
      const manufacturerId = await newManufacturer();
      const ballScrew = await newComponentType("ball-screw", ballScrewFields);
      const servoMotor = await newComponentType("servo-motor", servoMotorFields);

      const screwRevision = await catalog.createManufacturerPartRevision({
        manufacturerId,
        componentTypeId: ballScrew.componentTypeId,
        componentSchemaVersionId: ballScrew.schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm"), diameter: quantity(15, "mm") },
      });
      createdPartRevisionIds.push(screwRevision.id);

      const motorRevision = await catalog.createManufacturerPartRevision({
        manufacturerId,
        componentTypeId: servoMotor.componentTypeId,
        componentSchemaVersionId: servoMotor.schemaVersionId,
        partNumber: "SV2-B040AS",
        sourceRevision: "2026-catalog",
        attributes: { ratedTorque: quantity(1.3, "N*m"), ratedSpeed: quantity(3000, "rpm") },
      });
      createdPartRevisionIds.push(motorRevision.id);

      // Both rows live in the same generic `manufacturer_part_revisions` table
      // and `attributes` column — no schema change was needed for the second
      // component type's different attribute shape (Unit 2.6 exit criterion).
      const screwList = await catalog.listManufacturerPartRevisionsByComponentType(
        ballScrew.componentTypeId,
      );
      const motorList = await catalog.listManufacturerPartRevisionsByComponentType(
        servoMotor.componentTypeId,
      );
      expect(screwList.map((r) => r.id)).toEqual([screwRevision.id]);
      expect(motorList.map((r) => r.id)).toEqual([motorRevision.id]);
      expect(screwList[0]?.attributes).toEqual({
        lead: quantity(20, "mm"),
        diameter: quantity(15, "mm"),
      });
      expect(motorList[0]?.attributes).toEqual({
        ratedTorque: quantity(1.3, "N*m"),
        ratedSpeed: quantity(3000, "rpm"),
      });
    });

    it("rejects a component schema version with duplicate field keys", async () => {
      const { componentTypeId } = await newComponentType("ball-screw", ballScrewFields);
      await expect(
        catalog.createComponentSchemaVersion({
          componentTypeId,
          version: "1.0.1",
          fields: [
            { key: "lead", label: "Lead", valueKind: "quantity", required: true, unit: "mm" },
            { key: "lead", label: "Lead again", valueKind: "quantity", required: false },
          ],
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects a manufacturer part revision with malformed attributes", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      await expect(
        catalog.createManufacturerPartRevision({
          manufacturerId,
          componentTypeId,
          componentSchemaVersionId: schemaVersionId,
          partNumber: "BSS1520-914",
          sourceRevision: "2026-catalog",
          // @ts-expect-error deliberately malformed: a quantity with no unit
          attributes: { lead: { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value: 20 } },
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects a corrupt stored attributes payload on read", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      const revision = await catalog.createManufacturerPartRevision({
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm") },
      });
      createdPartRevisionIds.push(revision.id);

      // Bypass the repository to corrupt the stored JSONB directly.
      await client.prisma.manufacturerPartRevision.update({
        where: { id: revision.id },
        data: { attributes: { lead: { kind: "not-a-real-kind" } } },
      });

      await expect(catalog.loadManufacturerPartRevision(revision.id)).rejects.toMatchObject({
        code: "invalid_snapshot",
      });
    });

    it("enforces one part revision per manufacturer + part number + source revision", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      const input = {
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm") },
      };
      const first = await catalog.createManufacturerPartRevision(input);
      createdPartRevisionIds.push(first.id);

      await expect(catalog.createManufacturerPartRevision(input)).rejects.toThrow();
    });

    it("cascades datasheet attachments when their part revision is deleted", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      const revision = await catalog.createManufacturerPartRevision({
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm") },
      });

      const attachment = await catalog.createDatasheetAttachment({
        manufacturerPartRevisionId: revision.id,
        fileName: "bss1520-914.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        checksum: "sha256:test",
        storageKey: `datasheets/${revision.id}.pdf`,
        uploadSource: "manual",
      });

      await client.prisma.manufacturerPartRevision.delete({ where: { id: revision.id } });

      const row = await client.prisma.datasheetAttachment.findUnique({
        where: { id: attachment.id },
      });
      expect(row).toBeNull();
    });

    it("restricts deleting a manufacturer that still has part revisions", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      const revision = await catalog.createManufacturerPartRevision({
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm") },
      });
      createdPartRevisionIds.push(revision.id);

      await expect(
        client.prisma.manufacturer.delete({ where: { id: manufacturerId } }),
      ).rejects.toThrow();
    });
  },
);
