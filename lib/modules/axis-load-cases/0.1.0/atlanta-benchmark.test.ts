// Independent-benchmark tests (roadmap Module Definition of Done item 9;
// context/code-standards.md "Module Testing") for ./atlanta-benchmark.ts.
// Two checks:
//  1. Reproduces both of Atlanta's own published worked examples (pp. C-54,
//     C-55) within their stated catalog-rounding tolerance.
//  2. Cross-checks the benchmark against ./math.ts's resolveAxisLoadPhase —
//     the module's own kernel — for the equivalent reduced scenario (no
//     guide resistance, no external force/moment, no center-of-mass offset;
//     horizontal reduces to incline = 0, vertical to incline = pi/2). The two
//     independently-authored formulas should agree to floating-point
//     precision, since they express the same underlying physics.

import { describe, expect, it } from "vitest";
import { resolveAxisLoadPhase } from "./math";
import {
  AtlantaBenchmarkInputError,
  resolveAtlantaHorizontalForce,
  resolveAtlantaVerticalForce,
  type AtlantaHorizontalInput,
  type AtlantaVerticalInput,
} from "./atlanta-benchmark";

describe("resolveAtlantaHorizontalForce vs. published example (p. C-54)", () => {
  const input: AtlantaHorizontalInput = {
    movingMassKg: 820,
    velocityMps: 2,
    accelerationTimeS: 1,
    gravityMps2: 9.81,
    frictionCoefficient: 0.1,
  };

  it("reproduces the published 2.44 kN result", () => {
    // 820*9.81*0.1 + 820*2 = 804.42 + 1640 = 2444.42 N; published as 2.44 kN.
    expect(resolveAtlantaHorizontalForce(input)).toBeCloseTo(2444.42, 6);
    expect(
      Math.abs(resolveAtlantaHorizontalForce(input) - 2440),
    ).toBeLessThanOrEqual(5);
  });

  it("agrees with the module's own kernel for the equivalent horizontal scenario", () => {
    const kernelResult = resolveAxisLoadPhase({
      orientation: "horizontal",
      inclineAngleRad: 0,
      totalMovingMassKg: input.movingMassKg,
      gravityMps2: input.gravityMps2,
      frictionCoefficient: input.frictionCoefficient,
      // Coulomb normal load for a horizontal axis is the full weight.
      normalLoadN: input.movingMassKg * input.gravityMps2,
      guideResistanceN: 0,
      travelDirection: "positive",
      axialAccelerationMps2: input.velocityMps / input.accelerationTimeS,
    });
    expect(kernelResult.requiredAxialDriveForceN).toBeCloseTo(
      resolveAtlantaHorizontalForce(input),
      9,
    );
  });

  it("rejects non-positive kinematic or friction inputs", () => {
    expect(() =>
      resolveAtlantaHorizontalForce({ ...input, movingMassKg: 0 }),
    ).toThrow(AtlantaBenchmarkInputError);
    expect(() =>
      resolveAtlantaHorizontalForce({ ...input, velocityMps: -1 }),
    ).toThrow(AtlantaBenchmarkInputError);
    expect(() =>
      resolveAtlantaHorizontalForce({ ...input, accelerationTimeS: 0 }),
    ).toThrow(AtlantaBenchmarkInputError);
    expect(() =>
      resolveAtlantaHorizontalForce({ ...input, frictionCoefficient: -0.1 }),
    ).toThrow(AtlantaBenchmarkInputError);
    expect(() =>
      resolveAtlantaHorizontalForce({ ...input, frictionCoefficient: 1.1 }),
    ).toThrow(AtlantaBenchmarkInputError);
  });
});

describe("resolveAtlantaVerticalForce vs. published example (p. C-55)", () => {
  const input: AtlantaVerticalInput = {
    movingMassKg: 300,
    velocityMps: 1.08,
    accelerationTimeS: 0.27,
    gravityMps2: 9.81,
  };

  it("reproduces the published 4.1 kN result", () => {
    // a = 1.08/0.27 = 4 m/s^2 exactly; 300*9.81 + 300*4 = 2943 + 1200 = 4143 N;
    // published as 4.1 kN (coarser, 1-decimal-kN catalog rounding).
    expect(resolveAtlantaVerticalForce(input)).toBeCloseTo(4143, 6);
    expect(
      Math.abs(resolveAtlantaVerticalForce(input) - 4100),
    ).toBeLessThanOrEqual(50);
  });

  it("agrees with the module's own kernel for the equivalent vertical (lifting) scenario", () => {
    const kernelResult = resolveAxisLoadPhase({
      orientation: "vertical",
      inclineAngleRad: Math.PI / 2,
      totalMovingMassKg: input.movingMassKg,
      gravityMps2: input.gravityMps2,
      // No side-loading in a pure vertical lift: zero Coulomb normal load,
      // matching Atlanta's lifting formula having no friction term at all.
      frictionCoefficient: 0,
      normalLoadN: 0,
      guideResistanceN: 0,
      travelDirection: "positive",
      axialAccelerationMps2: input.velocityMps / input.accelerationTimeS,
    });
    expect(kernelResult.requiredAxialDriveForceN).toBeCloseTo(
      resolveAtlantaVerticalForce(input),
      9,
    );
  });

  it("rejects non-positive kinematic inputs", () => {
    expect(() =>
      resolveAtlantaVerticalForce({ ...input, movingMassKg: -1 }),
    ).toThrow(AtlantaBenchmarkInputError);
    expect(() =>
      resolveAtlantaVerticalForce({ ...input, velocityMps: 0 }),
    ).toThrow(AtlantaBenchmarkInputError);
    expect(() =>
      resolveAtlantaVerticalForce({ ...input, accelerationTimeS: -0.1 }),
    ).toThrow(AtlantaBenchmarkInputError);
    expect(() =>
      resolveAtlantaVerticalForce({ ...input, gravityMps2: 0 }),
    ).toThrow(AtlantaBenchmarkInputError);
  });
});
