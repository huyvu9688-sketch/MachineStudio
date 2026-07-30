// Tests for the catalog CSV import pipeline (Unit 2.7 part 1). Pure logic —
// no database needed, unlike the live-DB repository test files. Covers the
// implementation map's Unit 2.7 test plan: valid import, mixed units,
// missing required fields, duplicate source revision, invalid enum/numeric
// data, and partial failure behavior — plus the CSV tokenizer itself and the
// setup-time (mapping/schema/CSV mismatch) validation.

import { describe, expect, it } from "vitest";
import type { ComponentAttributeFieldDefinition } from "./types";
import type { ImportMapping } from "./import-mapping";
import { CsvImportError, parseCatalogCsv, parseCsvTable } from "./csv-import";

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
  {
    key: "material",
    label: "Material",
    valueKind: "material_ref",
    required: false,
  },
  {
    key: "preloaded",
    label: "Preloaded",
    valueKind: "boolean",
    required: false,
  },
  {
    key: "mounting",
    label: "Mounting",
    valueKind: "enum",
    required: false,
    enumId: "ball_screw.mounting",
  },
];

const mapping: ImportMapping = {
  id: "ball-screw-basic",
  version: "1.0.0",
  componentTypeId: "ball-screw",
  componentSchemaVersionId: "ball-screw@1.0.0",
  fields: [
    { target: "partNumber", source: { kind: "column", column: "Part Number" } },
    {
      target: "sourceRevision",
      source: { kind: "column", column: "Revision" },
    },
    {
      target: "sourceLink",
      source: { kind: "column", column: "Datasheet URL" },
    },
    { target: "lifecycleStatus", source: { kind: "column", column: "Status" } },
    {
      target: "lead",
      source: { kind: "column", column: "Lead (mm)" },
      sourceUnit: "mm",
    },
    {
      target: "diameter",
      source: { kind: "column", column: "Diameter (in)" },
      sourceUnit: "in",
    },
    { target: "material", source: { kind: "column", column: "Material" } },
    { target: "preloaded", source: { kind: "column", column: "Preloaded" } },
    { target: "mounting", source: { kind: "column", column: "Mounting" } },
  ],
};

const header =
  "Part Number,Revision,Datasheet URL,Status,Lead (mm),Diameter (in),Material,Preloaded,Mounting";

describe("parseCsvTable", () => {
  it("parses a simple header and rows", () => {
    const { header: h, rows } = parseCsvTable("a,b,c\n1,2,3\n4,5,6\n");
    expect(h).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields with embedded commas, newlines, and escaped quotes", () => {
    const csv = 'a,b\n"1,000","line1\nline2"\n"say ""hi""",plain\n';
    const { header: h, rows } = parseCsvTable(csv);
    expect(h).toEqual(["a", "b"]);
    expect(rows).toEqual([
      ["1,000", "line1\nline2"],
      ['say "hi"', "plain"],
    ]);
  });

  it("handles CRLF line endings", () => {
    const { header: h, rows } = parseCsvTable("a,b\r\n1,2\r\n3,4\r\n");
    expect(h).toEqual(["a", "b"]);
    expect(rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("skips blank lines and tolerates a file with no trailing newline", () => {
    const { header: h, rows } = parseCsvTable("a,b\n1,2\n\n3,4");
    expect(h).toEqual(["a", "b"]);
    expect(rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("pads a row with fewer cells than the header", () => {
    const { rows } = parseCsvTable("a,b,c\n1,2\n");
    expect(rows).toEqual([["1", "2"]]);
  });
});

describe("parseCatalogCsv — valid import", () => {
  it("imports a clean row, normalizing quantities and building EngineeringValues", () => {
    const csv =
      header +
      "\n" +
      "BSS1520-914,2026-catalog,https://example.com/bss1520-914.pdf,active,20,0.5906,steel-1045,true,fixed-fixed\n";

    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    expect(report.totalRows).toBe(1);
    expect(report.validRowCount).toBe(1);
    expect(report.invalidRowCount).toBe(0);

    const row = report.rows[0];
    expect(row?.ok).toBe(true);
    expect(row?.partNumber).toBe("BSS1520-914");
    expect(row?.sourceRevision).toBe("2026-catalog");
    expect(row?.sourceLink).toBe("https://example.com/bss1520-914.pdf");
    expect(row?.lifecycleStatus).toBe("active");
    expect(row?.attributes?.lead).toEqual({
      v: 1,
      kind: "quantity",
      value: 20,
      unit: "mm",
    });
    expect(row?.attributes?.material).toEqual({
      v: 1,
      kind: "material_ref",
      materialId: "steel-1045",
    });
    expect(row?.attributes?.preloaded).toEqual({
      v: 1,
      kind: "boolean",
      value: true,
    });
    expect(row?.attributes?.mounting).toEqual({
      v: 1,
      kind: "enum",
      enumId: "ball_screw.mounting",
      value: "fixed-fixed",
    });

    const diameter = row?.attributes?.diameter;
    expect(diameter?.kind).toBe("quantity");
    if (diameter?.kind === "quantity") {
      expect(diameter.unit).toBe("mm");
      expect(diameter.value).toBeCloseTo(15.00124, 4);
    }
  });

  it("leaves optional attributes absent when their cell is empty", () => {
    const csv = header + "\n" + "BSS1520-914,2026-catalog,,,20,0.5906,,,\n";
    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    const row = report.rows[0];
    expect(row?.ok).toBe(true);
    expect(row?.sourceLink).toBeUndefined();
    expect(row?.lifecycleStatus).toBeUndefined();
    expect(row?.attributes?.material).toBeUndefined();
    expect(row?.attributes?.preloaded).toBeUndefined();
    expect(row?.attributes?.mounting).toBeUndefined();
  });
});

describe("parseCatalogCsv — mixed units", () => {
  it("normalizes cells given in different source units to each field's canonical unit", () => {
    const csv = "Part Number,Revision,Lead (mm)\nA,r1,20\n";
    const localMapping: ImportMapping = {
      ...mapping,
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
          sourceUnit: "in",
        },
        {
          target: "diameter",
          source: { kind: "constant", value: "10" },
          sourceUnit: "mm",
        },
      ],
    };
    const report = parseCatalogCsv(csv, localMapping, ballScrewFields);
    const row = report.rows[0];
    expect(row?.ok).toBe(true);
    const lead = row?.attributes?.lead;
    expect(lead?.kind).toBe("quantity");
    if (lead?.kind === "quantity") {
      // 20 in -> mm
      expect(lead.value).toBeCloseTo(508, 6);
      expect(lead.unit).toBe("mm");
    }
  });
});

describe("parseCatalogCsv — missing required fields", () => {
  it("flags a row missing a required attribute without throwing", () => {
    const csv = header + "\n" + "BSS1520-914,2026-catalog,,,,0.5906,,,\n";
    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    const row = report.rows[0];
    expect(row?.ok).toBe(false);
    expect(row?.errors).toContainEqual({
      target: "lead",
      message: 'attribute "lead" is required',
    });
  });

  it("flags a row missing partNumber or sourceRevision", () => {
    const csv =
      header +
      "\n" +
      ",2026-catalog,,,20,0.5906,,,\n" +
      "BSS1520-914,,,,20,0.5906,,,\n";
    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    expect(report.rows[0]?.errors).toContainEqual({
      target: "partNumber",
      message: "partNumber is required",
    });
    expect(report.rows[1]?.errors).toContainEqual({
      target: "sourceRevision",
      message: "sourceRevision is required",
    });
  });
});

describe("parseCatalogCsv — duplicate source revision", () => {
  it("flags the second occurrence of the same partNumber + sourceRevision", () => {
    const csv =
      header +
      "\n" +
      "BSS1520-914,2026-catalog,,,20,0.5906,,,\n" +
      "BSS1520-914,2026-catalog,,,25,0.5906,,,\n";
    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    expect(report.rows[0]?.ok).toBe(true);
    expect(report.rows[1]?.ok).toBe(false);
    expect(report.rows[1]?.errors).toContainEqual({
      target: "(row)",
      message: "duplicate partNumber + sourceRevision already seen at row 1",
    });
  });
});

describe("parseCatalogCsv — invalid enum and numeric data", () => {
  it("flags an invalid numeric value", () => {
    const csv =
      header + "\n" + "BSS1520-914,2026-catalog,,,not-a-number,0.5906,,,\n";
    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    expect(report.rows[0]?.ok).toBe(false);
    expect(report.rows[0]?.errors).toContainEqual({
      target: "lead",
      message: 'invalid numeric value: "not-a-number"',
    });
  });

  it("flags an invalid lifecycle status value", () => {
    const csv =
      header + "\n" + "BSS1520-914,2026-catalog,,not-a-status,20,0.5906,,,\n";
    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    expect(report.rows[0]?.ok).toBe(false);
    expect(report.rows[0]?.errors).toContainEqual({
      target: "lifecycleStatus",
      message: 'invalid lifecycle status: "not-a-status"',
    });
  });

  it("flags an invalid boolean value", () => {
    const csv =
      header + "\n" + "BSS1520-914,2026-catalog,,,20,0.5906,,maybe,\n";
    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    expect(report.rows[0]?.ok).toBe(false);
    expect(report.rows[0]?.errors).toContainEqual({
      target: "preloaded",
      message: 'invalid boolean value: "maybe"',
    });
  });
});

describe("parseCatalogCsv — partial failure behavior", () => {
  it("reports every row's outcome independently and totals correctly", () => {
    const csv =
      header +
      "\n" +
      "BSS1520-914,2026-catalog,,,20,0.5906,,,\n" + // valid
      "BSS1520-915,2026-catalog,,,not-a-number,0.5906,,,\n" + // invalid: numeric
      "BSS1520-916,2026-catalog,,,25,0.5906,,,\n"; // valid

    const report = parseCatalogCsv(csv, mapping, ballScrewFields);
    expect(report.totalRows).toBe(3);
    expect(report.validRowCount).toBe(2);
    expect(report.invalidRowCount).toBe(1);
    expect(report.rows.map((r) => r.ok)).toEqual([true, false, true]);
    expect(report.rows[1]?.rowNumber).toBe(2);
  });
});

describe("parseCatalogCsv — setup validation (broken import, not a bad row)", () => {
  it("throws when the mapping does not cover partNumber", () => {
    const badMapping: ImportMapping = {
      ...mapping,
      fields: mapping.fields.filter((f) => f.target !== "partNumber"),
    };
    expect(() =>
      parseCatalogCsv(header + "\n", badMapping, ballScrewFields),
    ).toThrow(CsvImportError);
  });

  it("throws when the mapping targets an unknown attribute key", () => {
    const badMapping: ImportMapping = {
      ...mapping,
      fields: [
        ...mapping.fields,
        {
          target: "notARealAttribute",
          source: { kind: "constant", value: "x" },
        },
      ],
    };
    expect(() =>
      parseCatalogCsv(header + "\n", badMapping, ballScrewFields),
    ).toThrow(CsvImportError);
  });

  it("throws when the mapping targets a value kind CSV import cannot represent", () => {
    const curveFields: ComponentAttributeFieldDefinition[] = [
      ...ballScrewFields,
      {
        key: "torqueCurve",
        label: "Torque curve",
        valueKind: "curve",
        required: false,
      },
    ];
    const badMapping: ImportMapping = {
      ...mapping,
      fields: [
        ...mapping.fields,
        { target: "torqueCurve", source: { kind: "constant", value: "x" } },
      ],
    };
    expect(() =>
      parseCatalogCsv(header + "\n", badMapping, curveFields),
    ).toThrow(CsvImportError);
  });

  it("throws when a required schema field has no mapping entry", () => {
    const badMapping: ImportMapping = {
      ...mapping,
      fields: mapping.fields.filter((f) => f.target !== "lead"),
    };
    expect(() =>
      parseCatalogCsv(header + "\n", badMapping, ballScrewFields),
    ).toThrow(CsvImportError);
  });

  it("throws when a mapped column is missing from the CSV", () => {
    const csvMissingColumn = "Part Number,Revision\nBSS1520-914,2026-catalog\n";
    expect(() =>
      parseCatalogCsv(csvMissingColumn, mapping, ballScrewFields),
    ).toThrow(CsvImportError);
  });

  it("throws on an empty CSV with no header row", () => {
    expect(() => parseCatalogCsv("", mapping, ballScrewFields)).toThrow(
      CsvImportError,
    );
  });
});
