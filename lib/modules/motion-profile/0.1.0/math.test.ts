import { describe, expect, it } from "vitest";
import {
  MotionProfileInputError,
  resolveTrapezoidalMove,
  type TrapezoidalMoveInput,
} from "./math";

/** Distance implied by a result's own phase times/accelerations — an
 * independent cross-check that the kernel's algebra is self-consistent,
 * not a restatement of the formula under test. */
function impliedDistance(
  result: ReturnType<typeof resolveTrapezoidalMove>,
): number {
  const accelDistance =
    0.5 * result.peakAccelerationMps2 * result.accelerationTimeS ** 2;
  const decelDistance =
    0.5 * result.peakDecelerationMps2 * result.decelerationTimeS ** 2;
  return accelDistance + result.constantVelocityDistanceM + decelDistance;
}

describe("resolveTrapezoidalMove", () => {
  it("resolves a trapezoidal move (reaches the velocity ceiling)", () => {
    const result = resolveTrapezoidalMove({
      moveDistanceM: 1,
      maxVelocityMps: 1,
      maxAccelerationMps2: 2,
    });

    expect(result.profileType).toBe("trapezoidal");
    expect(result.peakVelocityMps).toBe(1);
    expect(result.accelerationTimeS).toBeCloseTo(0.5, 12);
    expect(result.decelerationTimeS).toBeCloseTo(0.5, 12);
    expect(result.constantVelocityDistanceM).toBeCloseTo(0.5, 12);
    expect(result.constantVelocityTimeS).toBeCloseTo(0.5, 12);
    expect(result.moveTimeS).toBeCloseTo(1.5, 12);
  });

  it("resolves a triangular move (never reaches the velocity ceiling)", () => {
    const result = resolveTrapezoidalMove({
      moveDistanceM: 0.1,
      maxVelocityMps: 1,
      maxAccelerationMps2: 2,
    });

    expect(result.profileType).toBe("triangular");
    expect(result.peakVelocityMps).toBeLessThan(1);
    expect(result.peakVelocityMps).toBeCloseTo(Math.sqrt(0.2), 12);
    expect(result.constantVelocityTimeS).toBe(0);
    expect(result.constantVelocityDistanceM).toBe(0);
    expect(result.moveTimeS).toBeCloseTo(2 * result.accelerationTimeS, 12);
  });

  it("agrees at the exact trapezoidal/triangular boundary", () => {
    // At v_lim = a_lim, the accel-to-limit distance is v_lim^2/(2*a_lim);
    // choosing moveDistanceM as exactly twice that puts the case on the
    // boundary. The trapezoidal branch is taken (`<=`), but its resolved
    // peak velocity must equal what the triangular formula would give.
    const maxVelocityMps = 2;
    const maxAccelerationMps2 = 2;
    const boundaryDistance =
      (maxVelocityMps * maxVelocityMps) / maxAccelerationMps2;

    const result = resolveTrapezoidalMove({
      moveDistanceM: boundaryDistance,
      maxVelocityMps,
      maxAccelerationMps2,
    });

    expect(result.profileType).toBe("trapezoidal");
    expect(result.peakVelocityMps).toBeCloseTo(maxVelocityMps, 12);
    expect(result.constantVelocityDistanceM).toBeCloseTo(0, 12);
    expect(result.constantVelocityTimeS).toBeCloseTo(0, 12);
    expect(result.peakVelocityMps).toBeCloseTo(
      Math.sqrt(maxAccelerationMps2 * boundaryDistance),
      9,
    );
  });

  it.each<TrapezoidalMoveInput>([
    { moveDistanceM: 1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
    { moveDistanceM: 0.1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
    { moveDistanceM: 500, maxVelocityMps: 0.3, maxAccelerationMps2: 1.5 },
    { moveDistanceM: 0.002, maxVelocityMps: 5, maxAccelerationMps2: 50 },
  ])(
    "conserves distance for %j (accel + cruise + decel = moveDistanceM)",
    (input) => {
      const result = resolveTrapezoidalMove(input);
      expect(impliedDistance(result)).toBeCloseTo(input.moveDistanceM, 9);
    },
  );

  it("keeps a symmetric profile: acceleration and deceleration phases match", () => {
    for (const input of [
      { moveDistanceM: 1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
      { moveDistanceM: 0.1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
    ]) {
      const result = resolveTrapezoidalMove(input);
      expect(result.decelerationTimeS).toBe(result.accelerationTimeS);
      expect(result.peakDecelerationMps2).toBe(result.peakAccelerationMps2);
    }
  });

  it("never resolves a peak velocity above the declared ceiling", () => {
    for (const input of [
      { moveDistanceM: 1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
      { moveDistanceM: 0.1, maxVelocityMps: 1, maxAccelerationMps2: 2 },
      { moveDistanceM: 1000, maxVelocityMps: 2, maxAccelerationMps2: 0.5 },
    ]) {
      const result = resolveTrapezoidalMove(input);
      expect(result.peakVelocityMps).toBeLessThanOrEqual(
        input.maxVelocityMps + 1e-9,
      );
    }
  });

  it("does not increase move time when the acceleration ceiling increases", () => {
    const slower = resolveTrapezoidalMove({
      moveDistanceM: 1,
      maxVelocityMps: 1,
      maxAccelerationMps2: 1,
    });
    const faster = resolveTrapezoidalMove({
      moveDistanceM: 1,
      maxVelocityMps: 1,
      maxAccelerationMps2: 10,
    });
    expect(faster.moveTimeS).toBeLessThanOrEqual(slower.moveTimeS);
  });

  it("rejects a non-positive or non-finite move distance", () => {
    expect(() =>
      resolveTrapezoidalMove({
        moveDistanceM: 0,
        maxVelocityMps: 1,
        maxAccelerationMps2: 1,
      }),
    ).toThrow(MotionProfileInputError);
    expect(() =>
      resolveTrapezoidalMove({
        moveDistanceM: -1,
        maxVelocityMps: 1,
        maxAccelerationMps2: 1,
      }),
    ).toThrow(MotionProfileInputError);
    expect(() =>
      resolveTrapezoidalMove({
        moveDistanceM: Number.NaN,
        maxVelocityMps: 1,
        maxAccelerationMps2: 1,
      }),
    ).toThrow(MotionProfileInputError);
    expect(() =>
      resolveTrapezoidalMove({
        moveDistanceM: Number.POSITIVE_INFINITY,
        maxVelocityMps: 1,
        maxAccelerationMps2: 1,
      }),
    ).toThrow(MotionProfileInputError);
  });

  it("rejects a non-positive velocity or acceleration ceiling", () => {
    expect(() =>
      resolveTrapezoidalMove({
        moveDistanceM: 1,
        maxVelocityMps: 0,
        maxAccelerationMps2: 1,
      }),
    ).toThrow(MotionProfileInputError);
    expect(() =>
      resolveTrapezoidalMove({
        moveDistanceM: 1,
        maxVelocityMps: 1,
        maxAccelerationMps2: -1,
      }),
    ).toThrow(MotionProfileInputError);
  });
});
