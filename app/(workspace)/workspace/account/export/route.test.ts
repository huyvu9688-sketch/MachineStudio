// Tests for the GET /workspace/account/export Route Handler (Unit 5.5).
// Mocks its real dependencies the same way bom/route.test.ts and
// report/route.test.ts do, so this stays a fast, isolated test rather than
// requiring a live database.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuthProtect, mockExportAccountData, mockLoggerError } = vi.hoisted(
  () => ({
    mockAuthProtect: vi.fn(),
    mockExportAccountData: vi.fn(),
    mockLoggerError: vi.fn(),
  }),
);

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: mockAuthProtect },
}));

vi.mock("@/lib/application", () => ({
  exportAccountData: mockExportAccountData,
}));

vi.mock("@/lib/logging", () => ({
  logger: { error: mockLoggerError },
  normalizeError: (error: unknown) => ({ value: error }),
}));

vi.mock("@/lib/db", () => ({
  asUserId: (id: string) => id,
}));

import { GET } from "./route";

describe("GET /workspace/account/export", () => {
  beforeEach(() => {
    mockAuthProtect.mockReset();
    mockAuthProtect.mockResolvedValue({ userId: "test-user-1" });
    mockExportAccountData.mockReset();
    mockLoggerError.mockReset();
  });

  it("returns the export as a downloadable JSON attachment", async () => {
    mockExportAccountData.mockResolvedValue({
      exportedAt: "2026-08-12T00:00:00.000Z",
      userId: "test-user-1",
      projects: [],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="machinestudio-account-export.json"',
    );
    const body = await response.json();
    expect(body.userId).toBe("test-user-1");
    expect(mockExportAccountData).toHaveBeenCalledWith("test-user-1");
  });

  it("returns a generic 500 and logs the real error when exportAccountData throws", async () => {
    const failure = new Error("connection reset");
    mockExportAccountData.mockRejectedValue(failure);

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("connection reset");
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Account export route failed",
      expect.objectContaining({
        route: "/workspace/account/export",
        userId: "test-user-1",
        error: { value: failure },
      }),
    );
  });
});
