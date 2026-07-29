import { describe, expect, it } from "vitest";
import { isBlockingStatus, overallCheckStatus } from "./checks";
import type { CheckResult, CheckStatus } from "./types";

function check(status: CheckStatus, id: string = status): CheckResult {
  return { id, status, message: `${id} message` };
}

describe("overallCheckStatus severity behavior", () => {
  it("is not_applicable for an empty set", () => {
    expect(overallCheckStatus([])).toBe("not_applicable");
  });

  it("is not_applicable when every check is not_applicable", () => {
    expect(overallCheckStatus([check("not_applicable", "a"), check("not_applicable", "b")])).toBe(
      "not_applicable",
    );
  });

  it("passes when all contributing checks pass (ignoring not_applicable)", () => {
    expect(overallCheckStatus([check("pass", "a"), check("not_applicable", "b")])).toBe("pass");
  });

  it("reports warning when a warning accompanies passes", () => {
    expect(overallCheckStatus([check("pass"), check("warning")])).toBe("warning");
  });

  it("a warning never masks a fail", () => {
    expect(overallCheckStatus([check("warning"), check("fail"), check("pass")])).toBe("fail");
  });

  it("a fail never presents as a pass", () => {
    expect(overallCheckStatus([check("pass", "a"), check("fail", "b")])).toBe("fail");
  });

  it("invalid_input outranks a fail", () => {
    expect(overallCheckStatus([check("fail"), check("invalid_input")])).toBe("invalid_input");
  });
});

describe("isBlockingStatus", () => {
  it("blocks on fail and invalid_input only", () => {
    expect(isBlockingStatus("fail")).toBe(true);
    expect(isBlockingStatus("invalid_input")).toBe(true);
    expect(isBlockingStatus("warning")).toBe(false);
    expect(isBlockingStatus("pass")).toBe(false);
    expect(isBlockingStatus("not_applicable")).toBe(false);
  });
});
