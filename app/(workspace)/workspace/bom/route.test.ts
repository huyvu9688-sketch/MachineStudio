// Tests for the GET /workspace/bom Route Handler (Unit 5.1) — the first
// Route Handler in this codebase. Mocks its three real dependencies
// (Clerk's auth.protect(), loadBomView, buildBomCsv) the same way
// actions.test.ts mocks the equivalent Server Action dependencies, so this
// stays a fast, isolated test rather than requiring a live database.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuthProtect, mockLoadBomView } = vi.hoisted(() => ({
  mockAuthProtect: vi.fn(),
  mockLoadBomView: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: mockAuthProtect },
}));

vi.mock("@/lib/application", () => ({
  loadBomView: mockLoadBomView,
}));

// buildBomCsv is exercised for real (it's pure, no reason to mock it) —
// only its own dedicated test file (lib/reports/bom-csv.test.ts) needs to
// cover its formatting in detail; this file only needs to confirm the route
// actually calls it and returns its output with the right headers.

vi.mock("@/lib/db", () => ({
  asMachineConfigurationId: (id: string) => id,
  asUserId: (id: string) => id,
}));

import { GET } from "./route";

function requestFor(query: string): Request {
  return new Request(`http://localhost/workspace/bom${query}`);
}

describe("GET /workspace/bom", () => {
  beforeEach(() => {
    mockAuthProtect.mockReset();
    mockAuthProtect.mockResolvedValue({ userId: "test-user-1" });
    mockLoadBomView.mockReset();
  });

  it("returns 400 when ?configuration= is missing", async () => {
    const response = await GET(requestFor(""));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_input");
    expect(mockLoadBomView).not.toHaveBeenCalled();
  });

  it("returns 404 when loadBomView resolves null (not found or not owned)", async () => {
    mockLoadBomView.mockResolvedValue(null);
    const response = await GET(requestFor("?configuration=cfg-1"));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("not_found");
    expect(mockLoadBomView).toHaveBeenCalledWith("cfg-1", "test-user-1");
  });

  it("returns CSV text with the correct content type and a slugified attachment filename", async () => {
    mockLoadBomView.mockResolvedValue({
      configurationId: "cfg-1",
      configurationName: "X Axis / Rev 2!",
      machineLevelItems: [],
      assemblies: [],
      totalLineCount: 0,
      staleLineCount: 0,
    });

    const response = await GET(requestFor("?configuration=cfg-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="bom-x-axis-rev-2.csv"',
    );
    const text = await response.text();
    expect(text).toBe(
      "Assembly,Target,Description,Manufacturer,Part number,Revision / notes,Quantity,Source,Stale,Supporting run\r\n",
    );
  });

  it("falls back to a generic filename when the configuration name has no safe characters", async () => {
    mockLoadBomView.mockResolvedValue({
      configurationId: "cfg-1",
      configurationName: "!!!",
      machineLevelItems: [],
      assemblies: [],
      totalLineCount: 0,
      staleLineCount: 0,
    });

    const response = await GET(requestFor("?configuration=cfg-1"));

    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="bom-configuration.csv"',
    );
  });
});
