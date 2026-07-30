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
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "../../engine/values";
import type { Quantity } from "../../engine/values";
import type { ComponentAttributeFieldDefinition } from "../../catalog";
import { asManufacturerPartRevisionId } from "./catalog-types";
import type {
  ComponentSchemaVersionId,
  ComponentTypeId,
  ManufacturerId,
} from "./catalog-types";

function quantity(value: number, unit: string): Quantity {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value, unit };
}

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

const servoMotorFields: ComponentAttributeFieldDefinition[] = [
  {
    key: "ratedTorque",
    label: "Rated Torque",
    valueKind: "quantity",
    required: true,
    unit: "N*m",
  },
  {
    key: "ratedSpeed",
    label: "Rated Speed",
    valueKind: "quantity",
    required: true,
    unit: "rpm",
  },
];

describe.skipIf(!liveDatabaseAvailable)(
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
      return {
        componentTypeId: componentType.id,
        schemaVersionId: schemaVersion.id,
      };
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

      const loadedSchemaVersion =
        await catalog.loadComponentSchemaVersion(schemaVersionId);
      expect(loadedSchemaVersion?.fields).toEqual(ballScrewFields);
    });

    it("creates a catalog import batch and loads it back", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );

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
      expect(loaded?.importMappingId).toBeNull();
      expect(loaded?.totalRowCount).toBeNull();
    });

    it("records a catalog import batch's row-count summary and mapping identity", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );

      const batch = await catalog.createCatalogImportBatch({
        componentTypeId,
        manufacturerId,
        sourceLabel: "2026-07 ball screw catalog.csv",
        importMappingId: "ball-screw-basic",
        importMappingVersion: "1.0.0",
        totalRowCount: 10,
        validRowCount: 8,
        invalidRowCount: 2,
      });
      createdImportBatchIds.push(batch.id);

      const loaded = await catalog.loadCatalogImportBatch(batch.id);
      expect(loaded?.importMappingId).toBe("ball-screw-basic");
      expect(loaded?.importMappingVersion).toBe("1.0.0");
      expect(loaded?.totalRowCount).toBe(10);
      expect(loaded?.validRowCount).toBe(8);
      expect(loaded?.invalidRowCount).toBe(2);
    });

    it("lets two component types with different attributes coexist without a Prisma schema change", async () => {
      const manufacturerId = await newManufacturer();
      const ballScrew = await newComponentType("ball-screw", ballScrewFields);
      const servoMotor = await newComponentType(
        "servo-motor",
        servoMotorFields,
      );

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
        attributes: {
          ratedTorque: quantity(1.3, "N*m"),
          ratedSpeed: quantity(3000, "rpm"),
        },
      });
      createdPartRevisionIds.push(motorRevision.id);

      // Both rows live in the same generic `manufacturer_part_revisions` table
      // and `attributes` column — no schema change was needed for the second
      // component type's different attribute shape (Unit 2.6 exit criterion).
      const screwList =
        await catalog.listManufacturerPartRevisionsByComponentType(
          ballScrew.componentTypeId,
        );
      const motorList =
        await catalog.listManufacturerPartRevisionsByComponentType(
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
      const { componentTypeId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      await expect(
        catalog.createComponentSchemaVersion({
          componentTypeId,
          version: "1.0.1",
          fields: [
            {
              key: "lead",
              label: "Lead",
              valueKind: "quantity",
              required: true,
              unit: "mm",
            },
            {
              key: "lead",
              label: "Lead again",
              valueKind: "quantity",
              required: false,
            },
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
          attributes: {
            // @ts-expect-error deliberately malformed: a quantity with no unit
            lead: {
              v: SERIALIZATION_FORMAT_VERSION,
              kind: "quantity",
              value: 20,
            },
          },
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects a corrupt stored attributes payload on read", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );

      // manufacturer_part_revisions' immutability trigger (ADR-0006) rejects
      // every UPDATE (verified by the next test), so corrupting an existing
      // row via an `.update()` bypass — the way this test used to — is no
      // longer possible. That is the point of the trigger. Instead, insert a
      // row with an already-corrupt payload directly, simulating data written
      // before a stricter schema version, the same scenario the trigger
      // cannot protect against on its own (mirrors
      // baseline-repository.test.ts's "rejects a corrupt stored snapshot on
      // read").
      const corruptId = randomUUID();
      await client.prisma.$executeRaw`
        INSERT INTO manufacturer_part_revisions
          (id, "manufacturerId", "componentTypeId", "componentSchemaVersionId", "partNumber", "sourceRevision", attributes, "createdAt", "updatedAt")
        VALUES
          (${corruptId}, ${manufacturerId}, ${componentTypeId}, ${schemaVersionId}, 'BSS1520-914', '2026-catalog', '{"lead": {"kind": "not-a-real-kind"}}'::jsonb, now(), now())
      `;
      createdPartRevisionIds.push(corruptId);

      await expect(
        catalog.loadManufacturerPartRevision(asManufacturerPartRevisionId(corruptId)),
      ).rejects.toMatchObject({
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

      await expect(
        catalog.createManufacturerPartRevision(input),
      ).rejects.toThrow();
    });

    it("upsertManufacturerPartRevision creates when no matching identity exists", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      const revision = await catalog.upsertManufacturerPartRevision({
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm") },
      });
      createdPartRevisionIds.push(revision.id);
      expect(revision.attributes).toEqual({ lead: quantity(20, "mm") });
    });

    it("upsertManufacturerPartRevision returns the existing row for an exact repeat import (idempotent)", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      const identity = {
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: quantity(20, "mm") },
        dataQualityStatus: "warning" as const,
      };

      const first = await catalog.upsertManufacturerPartRevision(identity);
      createdPartRevisionIds.push(first.id);

      // Re-running the identical import is a no-op: one row, unchanged.
      const second = await catalog.upsertManufacturerPartRevision(identity);

      expect(second.id).toBe(first.id);
      expect(second.attributes).toEqual({ lead: quantity(20, "mm") });
      expect(second.dataQualityStatus).toBe("warning");
      expect(second.updatedAt).toEqual(first.updatedAt);

      const all =
        await catalog.listManufacturerPartRevisionsByComponentType(
          componentTypeId,
        );
      expect(all.map((r) => r.id)).toEqual([first.id]);
    });

    it("upsertManufacturerPartRevision reports a conflict instead of rewriting changed content (ADR-0006)", async () => {
      const manufacturerId = await newManufacturer();
      const { componentTypeId, schemaVersionId } = await newComponentType(
        "ball-screw",
        ballScrewFields,
      );
      const identity = {
        manufacturerId,
        componentTypeId,
        componentSchemaVersionId: schemaVersionId,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
      };

      const first = await catalog.upsertManufacturerPartRevision({
        ...identity,
        attributes: { lead: quantity(20, "mm") },
      });
      createdPartRevisionIds.push(first.id);

      // A baseline or component assignment may already pin this exact revision,
      // so a corrected lead is a new source revision — not an edit.
      await expect(
        catalog.upsertManufacturerPartRevision({
          ...identity,
          attributes: { lead: quantity(25, "mm") },
        }),
      ).rejects.toMatchObject({ code: "conflict" });

      const reloaded = await catalog.loadManufacturerPartRevision(first.id);
      expect(reloaded?.attributes).toEqual({ lead: quantity(20, "mm") });

      // The corrected data is accepted under its own source revision.
      const corrected = await catalog.upsertManufacturerPartRevision({
        ...identity,
        sourceRevision: "2026-catalog-rev-b",
        attributes: { lead: quantity(25, "mm") },
      });
      createdPartRevisionIds.push(corrected.id);
      expect(corrected.id).not.toBe(first.id);
    });

    it("rejects any UPDATE to a part revision at the database (immutability trigger)", async () => {
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

      // Bypassing the repository entirely: the guard is in the database, so a
      // direct write cannot rewrite an engineering record either.
      await expect(
        client.prisma.manufacturerPartRevision.update({
          where: { id: revision.id },
          data: {
            attributes: { lead: quantity(25, "mm") } as unknown as Record<
              string,
              never
            >,
          },
        }),
      ).rejects.toThrow(/immutable/i);

      await expect(
        client.prisma.manufacturerPartRevision.update({
          where: { id: revision.id },
          data: { lifecycleStatus: "obsolete" },
        }),
      ).rejects.toThrow(/immutable/i);
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

      await client.prisma.manufacturerPartRevision.delete({
        where: { id: revision.id },
      });

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
