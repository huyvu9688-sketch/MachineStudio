import { describe, expect, it } from "vitest";
import { IndexTableMotorSizingInputError } from "./math";
import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveTableInertia,
  resolveTotalSystemInertia,
} from "./math";

// --- 1. Inertia --------------------------------------------------------------

describe("resolveTableInertia", () => {
  it("returns (1/8)*M*D^2, matching lib/engine/mechanics directly", () => {
    expect(
      resolveTableInertia({ tableMassKg: 46.68, tableDiameterM: 0.3048 })
        .inertiaKgM2,
    ).toBeCloseTo((46.68 * 0.3048 ** 2) / 8, 12);
  });

  it("rejects a non-positive mass or diameter", () => {
    expect(() =>
      resolveTableInertia({ tableMassKg: 0, tableDiameterM: 0.3 }),
    ).toThrow(IndexTableMotorSizingInputError);
    expect(() =>
      resolveTableInertia({ tableMassKg: 10, tableDiameterM: 0 }),
    ).toThrow(IndexTableMotorSizingInputError);
  });
});

describe("resolveLoadInertia", () => {
  it("returns tableInertia + attachedLoadInertia", () => {
    const { loadInertiaKgM2 } = resolveLoadInertia({
      tableInertiaKgM2: 0.06,
      attachedLoadInertiaKgM2: 0.057,
    });
    expect(loadInertiaKgM2).toBeCloseTo(0.117, 12);
  });

  it("is exactly the table inertia when no load is attached (0 default)", () => {
    const { loadInertiaKgM2 } = resolveLoadInertia({
      tableInertiaKgM2: 0.06,
      attachedLoadInertiaKgM2: 0,
    });
    expect(loadInertiaKgM2).toBe(0.06);
  });

  it("rejects a negative table or attached-load inertia", () => {
    expect(() =>
      resolveLoadInertia({
        tableInertiaKgM2: -1,
        attachedLoadInertiaKgM2: 0,
      }),
    ).toThrow(IndexTableMotorSizingInputError);
  });
});

describe("resolveReflectedLoadInertia / resolveTotalSystemInertia / resolveInertiaRatio", () => {
  it("divides by gear ratio squared, then adds the motor rotor inertia", () => {
    const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
      loadInertiaKgM2: 0.12,
      gearRatio: 6,
    });
    expect(reflectedLoadInertiaKgM2).toBeCloseTo(0.12 / 36, 12);

    const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1e-3,
      reflectedLoadInertiaKgM2,
    });
    expect(totalSystemInertiaKgM2).toBeCloseTo(1e-3 + 0.12 / 36, 12);

    const { inertiaRatio } = resolveInertiaRatio({
      reflectedLoadInertiaKgM2,
      motorRotorInertiaKgM2: 1e-3,
    });
    expect(inertiaRatio).toBeCloseTo(0.12 / 36 / 1e-3, 6);
  });
});

// --- 2. Motion: operating speed -----------------------------------------------

describe("resolveOperatingSpeed", () => {
  it("computes omega_table = theta/(t_index-t_A), then scales by gear ratio", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      indexAngleRad: Math.PI / 4,
      indexTimeS: 0.5,
      accelerationTimeS: 0.125,
      gearRatio: 6,
    });
    const expectedTableOmega = Math.PI / 4 / (0.5 - 0.125);
    expect(operatingSpeedRadPerS).toBeCloseTo(expectedTableOmega * 6, 9);
  });

  it("reproduces Oriental Motor's own N = (60*theta)/(360*(t0-t1)) worked-procedure figure (table shaft, i=1)", () => {
    // theta=30deg, t0=0.3s, t1=0.075s -> N=22.2 r/min (table shaft).
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      indexAngleRad: (30 * Math.PI) / 180,
      indexTimeS: 0.3,
      accelerationTimeS: 0.075,
      gearRatio: 1,
    });
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    expect(rpm).toBeCloseTo(22.2, 1);
  });

  it("scales linearly with gear ratio", () => {
    const direct = resolveOperatingSpeed({
      indexAngleRad: 1,
      indexTimeS: 1,
      accelerationTimeS: 0.2,
      gearRatio: 1,
    });
    const geared = resolveOperatingSpeed({
      indexAngleRad: 1,
      indexTimeS: 1,
      accelerationTimeS: 0.2,
      gearRatio: 4,
    });
    expect(geared.operatingSpeedRadPerS).toBeCloseTo(
      direct.operatingSpeedRadPerS * 4,
      9,
    );
  });

  it("rejects a non-positive angle, gear ratio, or acceleration time, and an acceleration time not less than the index time", () => {
    expect(() =>
      resolveOperatingSpeed({
        indexAngleRad: 0,
        indexTimeS: 1,
        accelerationTimeS: 0.2,
        gearRatio: 1,
      }),
    ).toThrow(IndexTableMotorSizingInputError);
    expect(() =>
      resolveOperatingSpeed({
        indexAngleRad: 1,
        indexTimeS: 0.2,
        accelerationTimeS: 0.2,
        gearRatio: 1,
      }),
    ).toThrow(IndexTableMotorSizingInputError);
  });

  it("0.2.1: rejects an infeasible profile where 2*accelerationTimeS exceeds indexTimeS (accelerationTimeS alone is still less than indexTimeS)", () => {
    // Reproduced case from the release audit: tAccel=0.75s, tIndex=1s implies
    // a negative cruise time (1 - 2*0.75 = -0.5s) for a symmetric
    // trapezoidal move, though accelerationTimeS (0.75) is itself still
    // less than indexTimeS (1) -- the pre-0.2.1 check alone would not have
    // caught this.
    expect(() =>
      resolveOperatingSpeed({
        indexAngleRad: 1,
        indexTimeS: 1,
        accelerationTimeS: 0.75,
        gearRatio: 1,
      }),
    ).toThrow(IndexTableMotorSizingInputError);
  });

  it("0.2.1: accepts the exact triangular-move boundary (2*accelerationTimeS === indexTimeS, zero cruise time)", () => {
    expect(() =>
      resolveOperatingSpeed({
        indexAngleRad: 1,
        indexTimeS: 1,
        accelerationTimeS: 0.5,
        gearRatio: 1,
      }),
    ).not.toThrow();
  });
});

describe("operating speed + angularAccelerationFromSpeedRamp + accelerationTorque, combined", () => {
  it("computes a positive acceleration torque for a real index move", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      indexAngleRad: Math.PI / 4,
      indexTimeS: 0.5,
      accelerationTimeS: 0.125,
      gearRatio: 6,
    });
    const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: 0.125,
    });
    const { torqueNm } = accelerationTorque({
      inertiaKgM2: 0.02,
      angularAccelerationRadPerS2,
    });
    expect(torqueNm).toBeCloseTo(0.02 * (operatingSpeedRadPerS / 0.125), 12);
    expect(torqueNm).toBeGreaterThan(0);
  });
});

// --- 3. Momentary and required torque -------------------------------------------

describe("resolveMomentaryTorque", () => {
  it("returns the plain sum of acceleration and load torque", () => {
    expect(
      resolveMomentaryTorque({ accelerationTorqueNm: 5, loadTorqueNm: 0 })
        .momentaryTorqueNm,
    ).toBeCloseTo(5, 9);
  });

  it("adds a nonzero engineer-supplied load torque", () => {
    expect(
      resolveMomentaryTorque({ accelerationTorqueNm: 5, loadTorqueNm: 1.2 })
        .momentaryTorqueNm,
    ).toBeCloseTo(6.2, 9);
  });

  it("rejects a negative acceleration or load torque", () => {
    expect(() =>
      resolveMomentaryTorque({ accelerationTorqueNm: -1, loadTorqueNm: 0 }),
    ).toThrow(IndexTableMotorSizingInputError);
  });
});

describe("resolveRequiredTorque", () => {
  it("multiplies the computed torque by the safety factor", () => {
    expect(
      resolveRequiredTorque({ computedTorqueNm: 12.38, safetyFactor: 2 })
        .requiredTorqueNm,
    ).toBeCloseTo(24.76, 9);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolveRequiredTorque({ computedTorqueNm: 12.38, safetyFactor: 0.9 }),
    ).toThrow(IndexTableMotorSizingInputError);
  });
});
