import { describe, expect, it } from "vitest";
import { buildBomCsv, flattenBomView } from "./bom-csv";
import type { BomItem, BomView } from "@/lib/application";

function item(overrides: Partial<BomItem> = {}): BomItem {
  return {
    id: "a1",
    targetKind: "module_instance",
    targetLabel: "Screw sizing",
    partSource: "catalog",
    description: "Acme BSS1520-914",
    manufacturerName: "Acme",
    partNumber: "BSS1520-914",
    sourceRevision: "2026-catalog",
    notes: null,
    quantity: 1,
    stale: false,
    staleReason: null,
    calculationRunId: "run-1",
    calculationRunCreatedAt: new Date("2026-08-11T00:00:00.000Z"),
    ...overrides,
  };
}

describe("flattenBomView", () => {
  it("flattens machine-level items under a fixed '(Machine)' path", () => {
    const view: BomView = {
      configurationId: "c1",
      configurationName: "Baseline",
      machineLevelItems: [item({ description: "Machine nameplate" })],
      assemblies: [],
      totalLineCount: 1,
      staleLineCount: 0,
    };
    const rows = flattenBomView(view);
    expect(rows).toHaveLength(1);
    expect(rows[0].assemblyPath).toBe("(Machine)");
    expect(rows[0].description).toBe("Machine nameplate");
  });

  it("joins nested assembly names with ' / ' for a multi-level path", () => {
    const view: BomView = {
      configurationId: "c1",
      configurationName: "Baseline",
      machineLevelItems: [],
      assemblies: [
        {
          assemblyId: "root",
          assemblyName: "X axis",
          items: [],
          children: [
            {
              assemblyId: "child",
              assemblyName: "Drive train",
              items: [item()],
              children: [],
            },
          ],
        },
      ],
      totalLineCount: 1,
      staleLineCount: 0,
    };
    const rows = flattenBomView(view);
    expect(rows).toHaveLength(1);
    expect(rows[0].assemblyPath).toBe("X axis / Drive train");
    expect(rows[0].target).toBe("Screw sizing");
  });

  it("labels an assembly-targeted item's target as '(assembly)' when it has no module label", () => {
    const view: BomView = {
      configurationId: "c1",
      configurationName: "Baseline",
      machineLevelItems: [],
      assemblies: [
        {
          assemblyId: "root",
          assemblyName: "X axis",
          items: [
            item({
              targetKind: "assembly",
              targetLabel: null,
              partSource: "manual",
              description: "Custom bracket",
              manufacturerName: null,
              partNumber: null,
              sourceRevision: null,
              notes: "Cut to length on site",
              calculationRunId: null,
              calculationRunCreatedAt: null,
            }),
          ],
          children: [],
        },
      ],
      totalLineCount: 1,
      staleLineCount: 0,
    };
    const rows = flattenBomView(view);
    expect(rows[0].target).toBe("(assembly)");
    expect(rows[0].manufacturerName).toBe("");
    expect(rows[0].sourceRevisionOrNotes).toBe("Cut to length on site");
  });
});

describe("buildBomCsv", () => {
  it("renders a header-only CSV for an empty BOM", () => {
    const view: BomView = {
      configurationId: "c1",
      configurationName: "Baseline",
      machineLevelItems: [],
      assemblies: [],
      totalLineCount: 0,
      staleLineCount: 0,
    };
    const csv = buildBomCsv(view);
    expect(csv).toBe(
      "Assembly,Target,Description,Manufacturer,Part number,Revision / notes,Quantity,Source,Stale,Supporting run\r\n",
    );
  });

  it("renders one CRLF-terminated row per line item with quantity and stale as plain strings", () => {
    const view: BomView = {
      configurationId: "c1",
      configurationName: "Baseline",
      machineLevelItems: [item({ quantity: 3, stale: true })],
      assemblies: [],
      totalLineCount: 1,
      staleLineCount: 1,
    };
    const csv = buildBomCsv(view);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe(
      "(Machine),Screw sizing,Acme BSS1520-914,Acme,BSS1520-914,2026-catalog,3,catalog,yes,run-1",
    );
    expect(lines[2]).toBe("");
  });

  it("quotes a field containing a comma and doubles an embedded quote", () => {
    const view: BomView = {
      configurationId: "c1",
      configurationName: "Baseline",
      machineLevelItems: [
        item({
          description: 'Bracket, 3" long "special"',
        }),
      ],
      assemblies: [],
      totalLineCount: 1,
      staleLineCount: 0,
    };
    const csv = buildBomCsv(view);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain('"Bracket, 3"" long ""special"""');
  });
});
