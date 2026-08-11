import { describe, expect, it } from "vitest";
import { buildMachineReportHtml } from "./machine-report-html";
import type {
  AssemblyReportNode,
  BomView,
  MachineReportView,
  ModuleReportView,
} from "@/lib/application";

function moduleView(overrides: Partial<ModuleReportView> = {}): ModuleReportView {
  return {
    moduleInstance: {
      id: "mi-1" as never,
      assemblyId: "a-1" as never,
      configurationId: "c-1" as never,
      label: "Screw sizing",
      modulePackageId: "ball-screw",
      moduleVersion: "0.1.0",
    },
    run: {
      id: "run-1",
      status: "pass",
      criticalMargin: 1.8,
      stale: false,
      staleReason: null,
      createdAt: new Date("2026-08-11T00:00:00.000Z"),
      engineSdkVersion: "1.0.0",
      modulePackageHash: "abc123",
      parameterRegistryVersion: "1.8.0",
    },
    inputs: [],
    outputs: [],
    checks: [],
    warnings: [],
    validity: [],
    trace: null,
    assumptions: [],
    activeLoadCase: null,
    sources: [],
    assignedParts: [],
    ...overrides,
  };
}

function assemblyNode(
  overrides: Partial<AssemblyReportNode> = {},
): AssemblyReportNode {
  return {
    assemblyId: "a-1",
    assemblyName: "X axis",
    modules: [],
    children: [],
    ...overrides,
  };
}

function emptyBom(): BomView {
  return {
    configurationId: "c-1",
    configurationName: "Baseline",
    machineLevelItems: [],
    assemblies: [],
    totalLineCount: 0,
    staleLineCount: 0,
  };
}

function view(overrides: Partial<MachineReportView> = {}): MachineReportView {
  return {
    project: { id: "p-1", name: "Axis Project" },
    configuration: { id: "c-1", name: "Baseline" },
    generatedAt: new Date("2026-08-11T12:00:00.000Z"),
    marketProfile: {
      id: "US-General-Industrial-Machinery",
      displayName: "US General Industrial Machinery",
      scope: "General industrial automated machinery.",
      disclaimer: "Not legal advice or certification.",
      entries: [
        {
          documentTitle: "ANSI B11.0-2023 — Safety of Machinery",
          edition: "2023",
          applicability: "baseline",
          use: "General machine safety reference.",
        },
      ],
    },
    requirements: {
      configurationId: "c-1" as never,
      requirements: [],
      designAssumptions: [],
      loadCases: [],
    },
    assemblies: [],
    bom: emptyBom(),
    openWarnings: [],
    openAssumptions: [],
    sources: [],
    latestBaseline: null,
    ...overrides,
  };
}

describe("buildMachineReportHtml", () => {
  it("wraps a titled document with cover project/configuration/generated-at info", () => {
    const html = buildMachineReportHtml(view());
    expect(html).toContain("<!doctype html>");
    expect(html).toContain(
      "<title>Baseline — Machine Calculation Package</title>",
    );
    expect(html).toContain("Axis Project");
    expect(html).toContain("Generated");
  });

  it("renders the resolved market profile with its baseline sources", () => {
    const html = buildMachineReportHtml(view());
    expect(html).toContain("US General Industrial Machinery");
    expect(html).toContain("ANSI B11.0-2023");
    expect(html).toContain("Not legal advice or certification.");
  });

  it("shows an honest notice when the market profile no longer resolves", () => {
    const html = buildMachineReportHtml(view({ marketProfile: null }));
    expect(html).toContain("no longer resolves");
  });

  it("renders the requirements matrix with status coloring and acceptance criteria", () => {
    const html = buildMachineReportHtml(
      view({
        requirements: {
          configurationId: "c-1" as never,
          requirements: [
            {
              id: "r-1" as never,
              configurationId: "c-1" as never,
              assemblyId: null,
              code: "R-1",
              statement: "The axis shall move the rated payload.",
              acceptanceCriteria: [
                {
                  id: "ac-1" as never,
                  requirementId: "r-1" as never,
                  statement: "Static safety factor >= 2.0.",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
              verificationStatus: "criteria_defined",
              createdAt: new Date(),
            },
          ],
          designAssumptions: [
            {
              id: "da-1" as never,
              configurationId: "c-1" as never,
              assemblyId: null,
              statement: "Ambient temperature stays within range.",
              rationale: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          loadCases: [
            {
              id: "lc-1" as never,
              configurationId: "c-1" as never,
              category: "peak",
              label: "Rapid traverse",
              description: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      }),
    );
    expect(html).toContain("R-1");
    expect(html).toContain("Acceptance criteria defined");
    expect(html).toContain("status-pass");
    expect(html).toContain("Static safety factor &gt;= 2.0.");
    expect(html).toContain("Ambient temperature stays within range.");
    expect(html).toContain("Rapid traverse");
    expect(html).toContain("no requirement-to-run link is implemented yet");
  });

  it("marks a requirement with no acceptance criteria as not yet defined", () => {
    const html = buildMachineReportHtml(
      view({
        requirements: {
          configurationId: "c-1" as never,
          requirements: [
            {
              id: "r-1" as never,
              configurationId: "c-1" as never,
              assemblyId: null,
              code: "R-2",
              statement: "The axis shall stop within the safety distance.",
              acceptanceCriteria: [],
              verificationStatus: "no_criteria_yet",
              createdAt: new Date(),
            },
          ],
          designAssumptions: [],
          loadCases: [],
        },
      }),
    );
    expect(html).toContain("No acceptance criteria yet");
    expect(html).toContain("status-warning");
  });

  it("renders the assembly/module summary and nests detailed calculations from the same tree", () => {
    const html = buildMachineReportHtml(
      view({
        assemblies: [
          assemblyNode({
            modules: [moduleView({ moduleInstance: { ...moduleView().moduleInstance, label: "Root module" } })],
            children: [
              assemblyNode({
                assemblyId: "a-2",
                assemblyName: "Drive train",
                modules: [
                  moduleView({
                    moduleInstance: { ...moduleView().moduleInstance, label: "Child module" },
                    run: {
                      id: "run-2",
                      status: "fail",
                      criticalMargin: -0.2,
                      stale: true,
                      staleReason: "Input changed.",
                      createdAt: new Date(),
                      engineSdkVersion: "1.0.0",
                      modulePackageHash: "def456",
                      parameterRegistryVersion: "1.8.0",
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
    // Summary table.
    expect(html).toContain("Root module");
    expect(html).toContain("Child module");
    expect(html).toContain("X axis / Drive train");
    expect(html).toContain("status-fail");
    // Detailed calculations nest the same modules.
    expect(html).toContain('class="module-report"');
    expect(html.indexOf("Assembly and module summary")).toBeLessThan(
      html.indexOf("Detailed calculations"),
    );
  });

  it("shows an empty notice when no module instances exist yet", () => {
    const html = buildMachineReportHtml(view({ assemblies: [] }));
    expect(html).toContain("This configuration has no module instances yet.");
    expect(html).toContain("This configuration has no assemblies yet.");
  });

  it("renders BOM items grouped by assembly path, or an empty notice", () => {
    const withBom = buildMachineReportHtml(
      view({
        bom: {
          configurationId: "c-1",
          configurationName: "Baseline",
          machineLevelItems: [
            {
              id: "ca-1",
              targetKind: "assembly",
              targetLabel: null,
              partSource: "manual",
              description: "Machine nameplate",
              manufacturerName: null,
              partNumber: null,
              sourceRevision: null,
              notes: null,
              quantity: 1,
              stale: false,
              staleReason: null,
              calculationRunId: null,
              calculationRunCreatedAt: null,
            },
          ],
          assemblies: [],
          totalLineCount: 1,
          staleLineCount: 0,
        },
      }),
    );
    expect(withBom).toContain("Machine nameplate");
    expect(withBom).toContain("(Machine)");

    const withoutBom = buildMachineReportHtml(view());
    expect(withoutBom).toContain("No components assigned yet.");
  });

  it("renders open warnings and assumptions attributed to their module instance", () => {
    const html = buildMachineReportHtml(
      view({
        openWarnings: [
          {
            moduleInstanceId: "mi-1",
            moduleInstanceLabel: "Screw sizing",
            warning: { id: "w1", message: "Near the validated envelope limit." },
          },
        ],
        openAssumptions: [
          {
            moduleInstanceId: "mi-1",
            moduleInstanceLabel: "Screw sizing",
            assumption: {
              id: "as1",
              statement: "Coefficient of friction assumed at 0.1.",
              value: null,
              sources: [],
            },
          },
        ],
      }),
    );
    expect(html).toContain("Screw sizing: Near the validated envelope limit.");
    expect(html).toContain("Coefficient of friction assumed at 0.1.");
  });

  it("renders the latest baseline's own module-package hashes, or a no-baseline notice", () => {
    const withBaseline = buildMachineReportHtml(
      view({
        latestBaseline: {
          id: "bl-1",
          label: "Design review 1",
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          moduleRefs: [
            {
              moduleInstanceId: "mi-1",
              moduleInstanceLabel: "Screw sizing",
              modulePackageId: "ball-screw",
              moduleVersion: "0.1.0",
              modulePackageHash: "abc123",
              status: "pass",
              stale: false,
            },
          ],
        },
      }),
    );
    expect(withBaseline).toContain("Design review 1");
    expect(withBaseline).toContain("ball-screw@0.1.0");
    expect(withBaseline).toContain("abc123");

    const withoutBaseline = buildMachineReportHtml(view());
    expect(withoutBaseline).toContain("This configuration has no baseline yet.");
  });

  it("escapes a configuration name containing HTML-significant characters", () => {
    const html = buildMachineReportHtml(
      view({ configuration: { id: "c-1", name: '<b>Axis "1"</b>' } }),
    );
    expect(html).not.toContain("<b>Axis");
    expect(html).toContain("&lt;b&gt;Axis &quot;1&quot;&lt;/b&gt;");
  });
});
