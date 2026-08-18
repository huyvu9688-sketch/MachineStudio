import { describe, expect, it } from "vitest";
import { resolveFieldDisabled } from "./resolve-field-disabled";

describe("resolveFieldDisabled", () => {
  it("is false when the field has no disabledWhen condition", () => {
    expect(resolveFieldDisabled(undefined, new Map())).toBe(false);
  });

  it("is false when the driving port has no resolved entry", () => {
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        new Map(),
      ),
    ).toBe(false);
  });

  it("is false when the driving port resolves to its registry default (no materialized view value)", () => {
    const resolvedByPortKey = new Map([
      ["motion_mode", { source: "default" as const }],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(false);
  });

  it("is false when the driving port's value is a different enum member", () => {
    const resolvedByPortKey = new Map([
      [
        "motion_mode",
        {
          source: "manual" as const,
          value: {
            v: 1 as const,
            kind: "enum" as const,
            enumId: "belt_pulley_motion_mode",
            value: "distance",
          },
        },
      ],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(false);
  });

  it("is true when the driving port's resolved enum value matches", () => {
    const resolvedByPortKey = new Map([
      [
        "motion_mode",
        {
          source: "manual" as const,
          value: {
            v: 1 as const,
            kind: "enum" as const,
            enumId: "belt_pulley_motion_mode",
            value: "velocity",
          },
        },
      ],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(true);
  });

  it("is false for a linked port whose value has not resolved yet (module output not yet run)", () => {
    const resolvedByPortKey = new Map([
      [
        "motion_mode",
        {
          source: "linked" as const,
          link: {} as never,
          value: null,
        },
      ],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(false);
  });
});
