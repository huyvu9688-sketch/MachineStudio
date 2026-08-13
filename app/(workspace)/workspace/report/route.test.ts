// Tests for the GET /workspace/report Route Handler (Unit 5.2, extended by
// Unit 5.3 for ?configuration=). Mocks its real dependencies (Clerk's
// auth.protect(), loadModuleReportView, loadAssemblyReportView,
// loadMachineReportView) the same way `bom/route.test.ts` (Unit 5.1) mocks
// the equivalent BOM dependencies — the HTML renderers themselves are pure
// and exercised for real (their own dedicated test files cover formatting
// in detail); this file only confirms the route picks the right view,
// applies the right status code, and sets the right headers.

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuthProtect,
  mockLoadModuleReportView,
  mockLoadAssemblyReportView,
  mockLoadMachineReportView,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockAuthProtect: vi.fn(),
  mockLoadModuleReportView: vi.fn(),
  mockLoadAssemblyReportView: vi.fn(),
  mockLoadMachineReportView: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: mockAuthProtect },
}));

vi.mock("@/lib/application", () => ({
  loadModuleReportView: mockLoadModuleReportView,
  loadAssemblyReportView: mockLoadAssemblyReportView,
  loadMachineReportView: mockLoadMachineReportView,
}));

vi.mock("@/lib/logging", () => ({
  logger: { error: mockLoggerError },
  normalizeError: (error: unknown) => ({ value: error }),
}));

vi.mock("@/lib/db", () => ({
  asModuleInstanceId: (id: string) => id,
  asAssemblyId: (id: string) => id,
  asMachineConfigurationId: (id: string) => id,
  asUserId: (id: string) => id,
}));

import { GET } from "./route";

function requestFor(query: string): Request {
  return new Request(`http://localhost/workspace/report${query}`);
}

function moduleView(label: string) {
  return {
    moduleInstance: {
      id: "mi-1",
      assemblyId: "a-1",
      configurationId: "c-1",
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

function assemblyView(name: string) {
  return {
    configurationId: "c-1",
    configurationName: "Baseline",
    root: {
      assemblyId: "a-1",
      assemblyName: name,
      modules: [],
      children: [],
    },
  };
}

function machineView(configurationName: string) {
  return {
    project: { id: "p-1", name: "Axis Project" },
    configuration: { id: "c-1", name: configurationName },
    generatedAt: new Date("2026-08-11T00:00:00.000Z"),
    marketProfile: null,
    requirements: {
      configurationId: "c-1",
      requirements: [],
      designAssumptions: [],
      loadCases: [],
    },
    assemblies: [],
    bom: {
      configurationId: "c-1",
      configurationName,
      machineLevelItems: [],
      assemblies: [],
      totalLineCount: 0,
      staleLineCount: 0,
    },
    openWarnings: [],
    openAssumptions: [],
    sources: [],
    latestBaseline: null,
  };
}

describe("GET /workspace/report", () => {
  beforeEach(() => {
    mockAuthProtect.mockReset();
    mockAuthProtect.mockResolvedValue({ userId: "test-user-1" });
    mockLoadModuleReportView.mockReset();
    mockLoadAssemblyReportView.mockReset();
    mockLoadMachineReportView.mockReset();
    mockLoggerError.mockReset();
  });

  it("returns 400 when none of ?module=, ?assembly=, ?configuration= is given", async () => {
    const response = await GET(requestFor(""));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_input");
  });

  it("returns 400 when more than one of ?module=, ?assembly=, ?configuration= is given", async () => {
    const response = await GET(requestFor("?module=mi-1&assembly=a-1"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_input");

    const responseAll = await GET(
      requestFor("?module=mi-1&assembly=a-1&configuration=c-1"),
    );
    expect(responseAll.status).toBe(400);
  });

  it("returns 404 when the module instance is not found or not owned", async () => {
    mockLoadModuleReportView.mockResolvedValue(null);
    const response = await GET(requestFor("?module=mi-1"));
    expect(response.status).toBe(404);
    expect(mockLoadModuleReportView).toHaveBeenCalledWith(
      "mi-1",
      "test-user-1",
    );
  });

  it("returns 404 when the assembly is not found or not owned", async () => {
    mockLoadAssemblyReportView.mockResolvedValue(null);
    const response = await GET(requestFor("?assembly=a-1"));
    expect(response.status).toBe(404);
    expect(mockLoadAssemblyReportView).toHaveBeenCalledWith(
      "a-1",
      "test-user-1",
    );
  });

  it("returns 404 when the configuration is not found or not owned", async () => {
    mockLoadMachineReportView.mockResolvedValue(null);
    const response = await GET(requestFor("?configuration=c-1"));
    expect(response.status).toBe(404);
    expect(mockLoadMachineReportView).toHaveBeenCalledWith(
      "c-1",
      "test-user-1",
    );
  });

  it("renders a module report as inline HTML with a slugified filename", async () => {
    mockLoadModuleReportView.mockResolvedValue(moduleView("Screw sizing #1"));
    const response = await GET(requestFor("?module=mi-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="module-report-screw-sizing-1.html"',
    );
    const text = await response.text();
    expect(text).toContain("<!doctype html>");
    expect(text).toContain("Screw sizing #1");
  });

  it("renders an assembly report as inline HTML with a slugified filename", async () => {
    mockLoadAssemblyReportView.mockResolvedValue(
      assemblyView("X Axis / Rev 2!"),
    );
    const response = await GET(requestFor("?assembly=a-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="assembly-report-x-axis-rev-2.html"',
    );
    const text = await response.text();
    expect(text).toContain("X Axis / Rev 2!");
  });

  it("renders a whole-machine report as inline HTML with a slugified filename", async () => {
    mockLoadMachineReportView.mockResolvedValue(machineView("X Axis / Rev 2!"));
    const response = await GET(requestFor("?configuration=c-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="machine-report-x-axis-rev-2.html"',
    );
    const text = await response.text();
    expect(text).toContain("X Axis / Rev 2!");
    expect(text).toContain("Machine Calculation Package");
  });

  it("returns a generic 500 and logs the real error when a report view throws", async () => {
    const failure = new Error("connection reset");
    mockLoadModuleReportView.mockRejectedValue(failure);

    const response = await GET(requestFor("?module=mi-1"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("connection reset");
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Report route failed",
      expect.objectContaining({
        route: "/workspace/report",
        moduleId: "mi-1",
        error: { value: failure },
      }),
    );
  });
});
