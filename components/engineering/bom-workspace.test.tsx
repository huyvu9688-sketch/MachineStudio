// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BomWorkspace } from "./bom-workspace";
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

const EMPTY_VIEW: BomView = {
  configurationId: "c1",
  configurationName: "Baseline",
  machineLevelItems: [],
  assemblies: [],
  totalLineCount: 0,
  staleLineCount: 0,
};

describe("BomWorkspace", () => {
  it("shows an empty state when there are no line items", () => {
    render(<BomWorkspace view={EMPTY_VIEW} />);
    expect(screen.getByText("No components assigned yet")).toBeInTheDocument();
  });

  it("renders the line/stale count summary and a Download CSV link pointing at the route handler", () => {
    const view: BomView = {
      ...EMPTY_VIEW,
      machineLevelItems: [item({ stale: true })],
      totalLineCount: 1,
      staleLineCount: 1,
    };
    render(<BomWorkspace view={view} />);

    expect(screen.getByText("1 line, 1 stale")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Download CSV/ });
    expect(link).toHaveAttribute("href", "/workspace/bom?configuration=c1");
  });

  it("renders machine-level items in their own section", () => {
    const view: BomView = {
      ...EMPTY_VIEW,
      machineLevelItems: [
        item({
          targetKind: "assembly",
          targetLabel: null,
          description: "Machine nameplate",
        }),
      ],
      totalLineCount: 1,
    };
    render(<BomWorkspace view={view} />);

    expect(screen.getByText("Machine-level items")).toBeInTheDocument();
    expect(screen.getByText("Machine nameplate")).toBeInTheDocument();
    expect(screen.getByText("(assembly)")).toBeInTheDocument();
  });

  it("renders nested assemblies recursively, each with its own items", () => {
    const view: BomView = {
      ...EMPTY_VIEW,
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
    };
    render(<BomWorkspace view={view} />);

    expect(screen.getByText("X axis")).toBeInTheDocument();
    expect(screen.getByText("Drive train")).toBeInTheDocument();
    expect(screen.getByText("Screw sizing")).toBeInTheDocument();
    expect(screen.getByText("Acme BSS1520-914")).toBeInTheDocument();
    expect(screen.getByText("rev 2026-catalog")).toBeInTheDocument();
  });

  it("renders a manual part's notes and a 'manual / custom part' tag instead of a catalog revision", () => {
    const view: BomView = {
      ...EMPTY_VIEW,
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
    };
    render(<BomWorkspace view={view} />);

    expect(screen.getByText("Custom bracket")).toBeInTheDocument();
    expect(screen.getByText("manual / custom part")).toBeInTheDocument();
    expect(screen.getByText("Cut to length on site")).toBeInTheDocument();
  });

  it("shows a Stale tag only for stale line items", () => {
    const view: BomView = {
      ...EMPTY_VIEW,
      machineLevelItems: [
        item({ id: "fresh", stale: false }),
        item({ id: "old", stale: true }),
      ],
      totalLineCount: 2,
      staleLineCount: 1,
    };
    render(<BomWorkspace view={view} />);

    expect(screen.getAllByText("Stale")).toHaveLength(1);
  });

  it("does not render an empty assembly block with no items and no descendant items", () => {
    const view: BomView = {
      ...EMPTY_VIEW,
      assemblies: [
        {
          assemblyId: "root",
          assemblyName: "Empty axis",
          items: [],
          children: [],
        },
      ],
      totalLineCount: 0,
    };
    render(<BomWorkspace view={view} />);

    // hasAnyContent() is false (totalLineCount 0), so the empty state wins
    // and no assembly heading renders at all — the tree section is skipped
    // entirely rather than showing an empty "Empty axis" heading.
    expect(screen.queryByText("Empty axis")).not.toBeInTheDocument();
    expect(screen.getByText("No components assigned yet")).toBeInTheDocument();
  });
});
