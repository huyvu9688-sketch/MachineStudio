import { describe, expect, it } from "vitest";
import { MotionProfileInputError } from "./math";
import {
  resolveMotionCycle,
  type DwellSegment,
  type MoveSegment,
} from "./cycle";

const trapezoidalMove: MoveSegment = {
  kind: "move",
  moveDistanceM: 1,
  maxVelocityMps: 1,
  maxAccelerationMps2: 2,
};

const triangularMove: MoveSegment = {
  kind: "move",
  moveDistanceM: 0.1,
  maxVelocityMps: 1,
  maxAccelerationMps2: 2,
};

function dwell(dwellTimeS: number): DwellSegment {
  return { kind: "dwell", dwellTimeS };
}

describe("resolveMotionCycle", () => {
  it("reduces to the single move's own values for a one-move cycle", () => {
    const result = resolveMotionCycle([trapezoidalMove]);

    expect(result.cycleTimeS).toBeCloseTo(1.5, 12);
    expect(result.peakVelocityMps).toBe(1);
    expect(result.peakAccelerationMps2).toBe(2);
    expect(result.peakDecelerationMps2).toBe(2);
    // accel(2, 0.5) + cruise(0, 0.5) + decel(2, 0.5): sqrt(4/1.5).
    expect(result.rmsAccelerationMps2).toBeCloseTo(Math.sqrt(4 / 1.5), 12);
  });

  it("resolves an RMS acceleration exactly equal to the acceleration ceiling for a pure triangular move (no cruise phase)", () => {
    // With zero cruise duration, both remaining phases run the whole cycle at
    // the acceleration ceiling, so the time-weighted RMS collapses to the
    // ceiling itself regardless of the specific move geometry.
    const result = resolveMotionCycle([triangularMove]);
    expect(result.rmsAccelerationMps2).toBeCloseTo(2, 9);
  });

  it("adds dwell time to cycle time without changing peak values, and lowers RMS acceleration", () => {
    const withoutDwell = resolveMotionCycle([trapezoidalMove]);
    const withDwell = resolveMotionCycle([trapezoidalMove, dwell(1)]);

    expect(withDwell.cycleTimeS).toBeCloseTo(withoutDwell.cycleTimeS + 1, 12);
    expect(withDwell.peakVelocityMps).toBe(withoutDwell.peakVelocityMps);
    expect(withDwell.peakAccelerationMps2).toBe(
      withoutDwell.peakAccelerationMps2,
    );
    expect(withDwell.peakDecelerationMps2).toBe(
      withoutDwell.peakDecelerationMps2,
    );
    expect(withDwell.rmsAccelerationMps2).toBeLessThan(
      withoutDwell.rmsAccelerationMps2,
    );
    // sqrt(4 / 2.5), matching the hand-derived single-move case above.
    expect(withDwell.rmsAccelerationMps2).toBeCloseTo(Math.sqrt(4 / 2.5), 12);
  });

  it("is scale-invariant under repeating an identical move (RMS ratio unchanged)", () => {
    const once = resolveMotionCycle([trapezoidalMove]);
    const twice = resolveMotionCycle([trapezoidalMove, trapezoidalMove]);

    expect(twice.cycleTimeS).toBeCloseTo(2 * once.cycleTimeS, 12);
    expect(twice.peakVelocityMps).toBe(once.peakVelocityMps);
    expect(twice.rmsAccelerationMps2).toBeCloseTo(once.rmsAccelerationMps2, 12);
  });

  it("takes the maximum peak values across segments with different ceilings", () => {
    const gentleMove: MoveSegment = {
      kind: "move",
      moveDistanceM: 1,
      maxVelocityMps: 0.5,
      maxAccelerationMps2: 1,
    };
    const result = resolveMotionCycle([gentleMove, trapezoidalMove]);

    expect(result.peakVelocityMps).toBe(1);
    expect(result.peakAccelerationMps2).toBe(2);
    expect(result.peakDecelerationMps2).toBe(2);
  });

  it("never resolves an RMS acceleration above the peak acceleration", () => {
    const cases: (readonly (MoveSegment | DwellSegment)[])[] = [
      [trapezoidalMove],
      [triangularMove],
      [trapezoidalMove, dwell(5)],
      [trapezoidalMove, triangularMove, dwell(0.2)],
      [trapezoidalMove, trapezoidalMove, dwell(10)],
    ];
    for (const segments of cases) {
      const result = resolveMotionCycle(segments);
      expect(result.rmsAccelerationMps2).toBeLessThanOrEqual(
        Math.max(result.peakAccelerationMps2, result.peakDecelerationMps2) +
          1e-9,
      );
    }
  });

  it("rejects an empty segment list", () => {
    expect(() => resolveMotionCycle([])).toThrow(MotionProfileInputError);
  });

  it("rejects a dwell-only sequence (no kinematics to resolve)", () => {
    expect(() => resolveMotionCycle([dwell(1), dwell(2)])).toThrow(
      MotionProfileInputError,
    );
  });

  it("rejects a negative dwell time", () => {
    expect(() => resolveMotionCycle([trapezoidalMove, dwell(-1)])).toThrow(
      MotionProfileInputError,
    );
  });

  it("rejects a non-finite dwell time", () => {
    expect(() =>
      resolveMotionCycle([trapezoidalMove, dwell(Number.NaN)]),
    ).toThrow(MotionProfileInputError);
  });

  it("propagates an invalid move segment's own validation error", () => {
    const invalidMove: MoveSegment = {
      kind: "move",
      moveDistanceM: 0,
      maxVelocityMps: 1,
      maxAccelerationMps2: 1,
    };
    expect(() => resolveMotionCycle([invalidMove])).toThrow(
      MotionProfileInputError,
    );
  });
});
