import { describe, expect, it } from "vitest";
import { buildAssemblyReportHtml } from "./assembly-report-html";
import type { AssemblyReportNode, AssemblyReportView, ModuleReportView } from "@/lib/application";

function moduleView(label: string): ModuleReportView {
  return {
    moduleInstance: {
      id: `mi-${label}` as never,
      assemblyId: "a-1" as never,
      configurationId: "c-1" as never,
      label,
      modulePackageId: "example-relay",
      moduleVersion: "0.1.0",
    },
    run: null,
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
  };
}

function node(overrides: Partial<AssemblyReportNode> = {}): AssemblyReportNode {
  return {
    assemblyId: "a-1",
    assemblyName: "X axis",
    modules: [],
    children: [],
    ...overrides,
  };
}

describe("buildAssemblyReportHtml", () => {
  it("wraps a titled document with the configuration name on the cover", () => {
    const view: AssemblyReportView = {
      configurationId: "c-1",
      configurationName: "Baseline",
      root: node(),
    };
    const html = buildAssemblyReportHtml(view);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>X axis — Assembly Calculation Report</title>");
    expect(html).toContain("Baseline");
    expect(html).toContain("No module instances in this assembly.");
  });

  it("renders the requested assembly's own modules and nests a child assembly's own modules beneath it", () => {
    const view: AssemblyReportView = {
      configurationId: "c-1",
      configurationName: "Baseline",
      root: node({
        modules: [moduleView("Root relay")],
        children: [
          node({
            assemblyId: "a-2",
            assemblyName: "Drive train",
            modules: [moduleView("Child relay")],
          }),
        ],
      }),
    };
    const html = buildAssemblyReportHtml(view);
    expect(html).toContain("Root relay");
    expect(html).toContain("Drive train");
    expect(html).toContain("Child relay");
    // The root heading appears before the nested child heading.
    expect(html.indexOf("X axis")).toBeLessThan(html.indexOf("Drive train"));
    expect(html.indexOf("Drive train")).toBeLessThan(
      html.indexOf("Child relay"),
    );
  });

  it("escapes an assembly name containing HTML-significant characters", () => {
    const view: AssemblyReportView = {
      configurationId: "c-1",
      configurationName: "Baseline",
      root: node({ assemblyName: '<b>Axis "1"</b>' }),
    };
    const html = buildAssemblyReportHtml(view);
    expect(html).not.toContain("<b>Axis");
    expect(html).toContain("&lt;b&gt;Axis &quot;1&quot;&lt;/b&gt;");
  });
});
