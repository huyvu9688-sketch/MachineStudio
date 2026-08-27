import { describe, expect, it } from "vitest";
import { resolveFactoredLoadMassKg } from "./math";

describe("guided-cylinder-sizing 0.2.0 math", () => {
  it("multiplies entered mass by the engineer-selected guided-load safety factor once", () => {
    expect(
      resolveFactoredLoadMassKg({ loadMassKg: 3, guidedLoadSafetyFactor: 2 }),
    ).toBe(6);
  });

  it("leaves the entered mass unchanged at a safety factor of one", () => {
    expect(
      resolveFactoredLoadMassKg({ loadMassKg: 3, guidedLoadSafetyFactor: 1 }),
    ).toBe(3);
  });
});
