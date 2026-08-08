import { describe, expect, it } from "vitest";
import { resolveTrapezoidalMove, type TrapezoidalMoveInput } from "./math";
import {
  OrientalMotorBenchmarkInputError,
  resolveOrientalMotorPositioningTime,
} from "./oriental-motor-benchmark";

/**
 * Cross-checks `resolveTrapezoidalMove` (elementary symmetric,
 * zero-starting-speed kinematics) against the independently sourced
 * Oriental Motor general method reproduced in `oriental-motor-benchmark.ts`
 * (General Catalog 2015/2016, p. H-23), reduced to
 * `accelerationMps2 = decelerationMps2 = maxAccelerationMps2` and
 * `startingVelocityMps = 0` — the only case both methods can express. This
 * is the "independent benchmark comparison" required by
 * context/code-standards.md "Module Testing" for `resolveTrapezoidalMove`,
 * ahead of a registered module package.
 */
describe("resolveTrapezoidalMove vs. Oriental Motor H-23 benchmark", () => {
  const cases: readonly TrapezoidalMoveInput[] = [
    { moveDistanceM: 1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
    { moveDistanceM: 0.1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
    { moveDistanceM: 500, maxVelocityMps: 0.3, maxAccelerationMps2: 1.5 },
    { moveDistanceM: 0.002, maxVelocityMps: 5, maxAccelerationMps2: 50 },
    { moveDistanceM: 0.5, maxVelocityMps: 320e-3, maxAccelerationMps2: 1.5 },
  ];

  it.each(cases)(
    "agrees on profile type, peak velocity, and move time for %j",
    (input) => {
      const kernel = resolveTrapezoidalMove(input);
      const benchmark = resolveOrientalMotorPositioningTime({
        moveDistanceM: input.moveDistanceM,
        operatingVelocityMps: input.maxVelocityMps,
        startingVelocityMps: 0,
        accelerationMps2: input.maxAccelerationMps2,
        decelerationMps2: input.maxAccelerationMps2,
      });

      expect(benchmark.profileType).toBe(kernel.profileType);
      expect(benchmark.peakVelocityMps).toBeCloseTo(kernel.peakVelocityMps, 9);
      expect(benchmark.positioningTimeS).toBeCloseTo(kernel.moveTimeS, 9);
    },
  );

  it("agrees at the exact trapezoidal/triangular boundary", () => {
    const maxVelocityMps = 2;
    const maxAccelerationMps2 = 2;
    const boundaryDistance =
      (maxVelocityMps * maxVelocityMps) / maxAccelerationMps2;

    const kernel = resolveTrapezoidalMove({
      moveDistanceM: boundaryDistance,
      maxVelocityMps,
      maxAccelerationMps2,
    });
    const benchmark = resolveOrientalMotorPositioningTime({
      moveDistanceM: boundaryDistance,
      operatingVelocityMps: maxVelocityMps,
      startingVelocityMps: 0,
      accelerationMps2: maxAccelerationMps2,
      decelerationMps2: maxAccelerationMps2,
    });

    expect(benchmark.peakVelocityMps).toBeCloseTo(kernel.peakVelocityMps, 9);
    expect(benchmark.positioningTimeS).toBeCloseTo(kernel.moveTimeS, 9);
  });

  it("rejects a starting speed at or above the operating speed", () => {
    expect(() =>
      resolveOrientalMotorPositioningTime({
        moveDistanceM: 1,
        operatingVelocityMps: 1,
        startingVelocityMps: 1,
        accelerationMps2: 1,
        decelerationMps2: 1,
      }),
    ).toThrow(OrientalMotorBenchmarkInputError);
  });

  it("rejects non-positive distance, speed, or acceleration inputs", () => {
    expect(() =>
      resolveOrientalMotorPositioningTime({
        moveDistanceM: 0,
        operatingVelocityMps: 1,
        startingVelocityMps: 0,
        accelerationMps2: 1,
        decelerationMps2: 1,
      }),
    ).toThrow(OrientalMotorBenchmarkInputError);
    expect(() =>
      resolveOrientalMotorPositioningTime({
        moveDistanceM: 1,
        operatingVelocityMps: 1,
        startingVelocityMps: 0,
        accelerationMps2: 0,
        decelerationMps2: 1,
      }),
    ).toThrow(OrientalMotorBenchmarkInputError);
  });
});
