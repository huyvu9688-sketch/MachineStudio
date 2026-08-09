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

  it("matches ABB AN00115's own walkthrough demo (p. 2-3, T = 2s)", () => {
    // ABB, Application Note AN00115 "Trapezoidal Move Calculations", Rev C
    // (EN), p. 2-3: "SPEED = 8, ACCEL = 16, DECEL = 16, MOVER = 12" — a
    // relative move 12 units long, reaching 8 units/sec, accelerating and
    // decelerating at 16 units/sec/sec. Printed answer: Ta = Td = 1/2 sec,
    // Da = Dd = 2 units, Ds = 8 units, Ts = 1 sec, T = 2 seconds. This is
    // resolveTrapezoidalMove's own forward direction exactly (distance +
    // velocity/acceleration ceiling -> time), unlike the p. 6-7 exercise
    // below. The source's own "Mint scale factor" units are deliberately
    // generic/user-defined (not necessarily SI) — the underlying kinematics
    // is unit-system-invariant, so this test assigns them directly as SI
    // (meters, m/s, m/s^2) without conversion. Read directly 2026-08-09 —
    // see lib/standards/engineering-sources.ts
    // "us.abb.trapezoidal_move_calculations@rev-c-en".
    const result = resolveTrapezoidalMove({
      moveDistanceM: 12,
      maxVelocityMps: 8,
      maxAccelerationMps2: 16,
    });
    expect(result.profileType).toBe("trapezoidal");
    expect(result.peakVelocityMps).toBeCloseTo(8, 9);
    expect(result.accelerationTimeS).toBeCloseTo(0.5, 9);
    expect(result.decelerationTimeS).toBeCloseTo(0.5, 9);
    expect(result.constantVelocityTimeS).toBeCloseTo(1, 9);
    expect(result.constantVelocityDistanceM).toBeCloseTo(8, 9);
    expect(result.moveTimeS).toBeCloseTo(2, 9);
  });

  it("matches ABB AN00115's own Exercise Answer (p. 6-7, T = 1s)", () => {
    // ABB AN00115 p. 6-7 "Exercise": a 200mm ball-screw move in 1 second.
    // The exercise itself solves the inverse problem this module does not
    // implement (assume an equal Ta/Ts/Td time split via the "third rule",
    // then derive speed/accel from the target total time) — not a direct
    // reproduction of resolveTrapezoidalMove's own input/output direction.
    // But its own "Exercise Answer" derives concrete SPEED/ACCEL/DECEL
    // values (250 mm/sec, 1250 mm/s/s) from that assumption; feeding those
    // forward through resolveTrapezoidalMove must reproduce the exercise's
    // own printed Ta = Td = 200ms, Ts = 600ms, T = 1 second exactly, since
    // the exercise's own algebra is self-consistent. Read directly
    // 2026-08-09 — see lib/standards/engineering-sources.ts
    // "us.abb.trapezoidal_move_calculations@rev-c-en".
    const result = resolveTrapezoidalMove({
      moveDistanceM: 0.2,
      maxVelocityMps: 0.25,
      maxAccelerationMps2: 1.25,
    });
    expect(result.profileType).toBe("trapezoidal");
    expect(result.peakVelocityMps).toBeCloseTo(0.25, 9);
    expect(result.accelerationTimeS).toBeCloseTo(0.2, 9);
    expect(result.decelerationTimeS).toBeCloseTo(0.2, 9);
    expect(result.constantVelocityTimeS).toBeCloseTo(0.6, 9);
    expect(result.moveTimeS).toBeCloseTo(1, 9);
  });

  it("matches Oriental Motor's EAS6 catalog example within display rounding (p. H-19, T ~= 1.77s)", () => {
    // Oriental Motor, General Catalog 2015/2016, p. H-19 "<Example
    // operation>": EAS6, vertical, load mass 15 kg, positioning distance
    // 500 mm, positioning time 1.77 s, operating speed 320 mm/s,
    // acceleration 1.5 m/s^2 (0.15 G) — no starting speed stated (Vs = 0,
    // this module's own scope), and the catalog's own "Acceleration" graph
    // is explicitly the shared accel/decel rate (symmetric, also this
    // module's own scope). Unlike the ABB examples above, this is a
    // graph-read reference value ("Confirming Using the Positioning
    // Distance - Positioning Time Graph"), not a full-precision formula
    // result, and its own inputs are printed to 2-3 significant figures —
    // resolveTrapezoidalMove's own result (1.7758s) differs from the
    // printed 1.77s by ~0.33%, within that display rounding. Read directly
    // 2026-08-09 (pages 1-11 of the cached PDF) — see
    // lib/standards/engineering-sources.ts
    // "jp.oriental_motor.linear_rotary_actuator_selection_calculations@2015-2016".
    const result = resolveTrapezoidalMove({
      moveDistanceM: 0.5,
      maxVelocityMps: 0.32,
      maxAccelerationMps2: 1.5,
    });
    expect(result.profileType).toBe("trapezoidal");
    expect(Math.abs(result.moveTimeS - 1.77)).toBeLessThanOrEqual(0.01);
  });
});
