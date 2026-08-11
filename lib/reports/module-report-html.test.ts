import { describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import {
  buildModuleReportHtml,
  renderModuleReportSection,
} from "./module-report-html";
import type { ModuleReportView } from "@/lib/application";

function view(overrides: Partial<ModuleReportView> = {}): ModuleReportView {
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
      criticalMargin: 1.5,
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

describe("renderModuleReportSection", () => {
  it("renders a not-run notice without a run section when the module has never been run", () => {
    const html = renderModuleReportSection(view({ run: null }));
    expect(html).toContain("has not been run yet");
    expect(html).not.toContain("Checks");
  });

  it("escapes a module label, warning message, and assumption statement containing HTML-significant characters", () => {
    const html = renderModuleReportSection(
      view({
        moduleInstance: {
          id: "mi-1" as never,
          assemblyId: "a-1" as never,
          configurationId: "c-1" as never,
          label: '<script>alert("x")</script>',
          modulePackageId: "ball-screw",
          moduleVersion: "0.1.0",
        },
        warnings: [{ id: "w1", message: "A & B < C" }],
        assumptions: [
          { id: "as1", statement: 'Assumes "steady state"', value: null, sources: [] },
        ],
      }),
    );
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &lt; C");
    expect(html).toContain("Assumes &quot;steady state&quot;");
  });

  it("renders inputs and outputs as formatted quantity rows", () => {
    const html = renderModuleReportSection(
      view({
        inputs: [
          {
            portKey: "payload_mass",
            parameterId: "motion.axis.payload_mass",
            label: "Payload mass",
            value: makeQuantity(10, "kg"),
            loadCase: null,
          },
        ],
        outputs: [
          {
            portKey: "thrust",
            parameterId: "motion.axis.thrust_force",
            label: "Thrust force",
            value: makeQuantity(150, "N"),
            loadCase: "peak",
          },
        ],
      }),
    );
    expect(html).toContain("Payload mass");
    expect(html).toContain("10 kg");
    expect(html).toContain("Thrust force");
    expect(html).toContain("150 N");
    expect(html).toContain("peak");
  });

  it("renders a stale banner with the recorded reason", () => {
    const html = renderModuleReportSection(
      view({
        run: {
          id: "run-1",
          status: "pass",
          criticalMargin: null,
          stale: true,
          staleReason: "Upstream payload mass changed.",
          createdAt: new Date("2026-08-11T00:00:00.000Z"),
          engineSdkVersion: "1.0.0",
          modulePackageHash: "abc123",
          parameterRegistryVersion: "1.8.0",
        },
      }),
    );
    expect(html).toContain("stale-banner");
    expect(html).toContain("Upstream payload mass changed.");
  });

  it("renders the checks table with status, criterion, and margin", () => {
    const html = renderModuleReportSection(
      view({
        checks: [
          {
            id: "sf-static",
            status: "fail",
            message: "Static safety factor too low",
            criterion: "SF_s >= 2.0",
            observed: makeQuantity(1.2, "ratio"),
            allowable: makeQuantity(2, "ratio"),
            margin: makeQuantity(-0.8, "ratio"),
          },
        ],
      }),
    );
    expect(html).toContain("status-fail");
    expect(html).toContain("SF_s &gt;= 2.0");
  });

  it("renders a nested trace section and step with its method id and operands", () => {
    const html = renderModuleReportSection(
      view({
        trace: {
          v: 1,
          sections: [
            {
              node: "section",
              id: "sec-1",
              title: "Pass-through",
              children: [
                {
                  node: "step",
                  id: "step-1",
                  title: "Relay value",
                  methodId: "fixture.identity",
                  expression: "F_out = F_in",
                  inputs: [
                    { label: "F_in", value: makeQuantity(120, "N") },
                  ],
                  outputs: [
                    { label: "F_out", value: makeQuantity(120, "N") },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );
    expect(html).toContain("Pass-through");
    expect(html).toContain("Relay value");
    expect(html).toContain("fixture.identity");
    expect(html).toContain("F_in = 120 N");
  });

  it("renders assigned parts with quantity and a stale badge", () => {
    const html = renderModuleReportSection(
      view({
        assignedParts: [
          {
            id: "ca-1",
            partSource: "catalog",
            description: "Acme BSS1520-914",
            manufacturerName: "Acme",
            partNumber: "BSS1520-914",
            sourceRevision: "2026-catalog",
            notes: null,
            quantity: 2,
            stale: true,
            staleReason: null,
          },
        ],
      }),
    );
    expect(html).toContain("Acme BSS1520-914");
    expect(html).toContain("2026-catalog");
  });
});

describe("buildModuleReportHtml", () => {
  it("wraps the module section in a complete, titled HTML document", () => {
    const html = buildModuleReportHtml(view());
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Screw sizing — Calculation Report</title>");
    expect(html).toContain('class="module-report"');
  });
});
