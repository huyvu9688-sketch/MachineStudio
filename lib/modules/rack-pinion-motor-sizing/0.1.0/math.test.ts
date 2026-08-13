import { describe, expect, it } from "vitest";
import { RackPinionMotorSizingInputError } from "./math";
import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  resolveDriveForce,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolvePinionInertia,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveTotalSystemInertia,
} from "./math";

const G = 9.80665;

// --- 1. Inertia --------------------------------------------------------------

describe("resolvePinionInertia", () => {
  it("returns (1/8)*M*D^2, matching lib/engine/mechanics directly", () => {
    expect(
      resolvePinionInertia({ massKg: 1, diameterM: 0.1016 }).inertiaKgM2,
    ).toBeCloseTo((1 * 0.1016 ** 2) / 8, 15);
  });

  it("rejects a non-positive mass or diameter", () => {
    expect(() =>
      resolvePinionInertia({ massKg: 0, diameterM: 0.1 }),
    ).toThrow(RackPinionMotorSizingInputError);
    expect(() =>
      resolvePinionInertia({ massKg: 1, diameterM: 0 }),
    ).toThrow(RackPinionMotorSizingInputError);
  });
});

describe("resolveLoadInertia", () => {
  it("returns pinionInertia + m*(D/2)^2, mirroring ball-screw-motor-sizing's own resolveLoadInertia composition", () => {
    const { loadInertiaKgM2 } = resolveLoadInertia({
      pinionInertiaKgM2: 1e-4,
      totalMovingMassKg: 50,
      pinionPitchDiameterM: 0.08,
    });
    expect(loadInertiaKgM2).toBeCloseTo(1e-4 + 50 * (0.08 / 2) ** 2, 12);
  });

  it("rejects a non-positive mass or diameter", () => {
    expect(() =>
      resolveLoadInertia({
        pinionInertiaKgM2: 1e-4,
        totalMovingMassKg: 0,
        pinionPitchDiameterM: 0.08,
      }),
    ).toThrow(RackPinionMotorSizingInputError);
  });
});

describe("resolveReflectedLoadInertia / resolveTotalSystemInertia / resolveInertiaRatio", () => {
  it("divides by gear ratio squared, then adds the motor rotor inertia", () => {
    const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
      loadInertiaKgM2: 0.08,
      gearRatio: 4,
    });
    expect(reflectedLoadInertiaKgM2).toBeCloseTo(0.08 / 16, 12);

    const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1e-4,
      reflectedLoadInertiaKgM2,
    });
    expect(totalSystemInertiaKgM2).toBeCloseTo(1e-4 + 0.08 / 16, 12);

    const { inertiaRatio } = resolveInertiaRatio({
      reflectedLoadInertiaKgM2,
      motorRotorInertiaKgM2: 1e-4,
    });
    expect(inertiaRatio).toBeCloseTo((0.08 / 16) / 1e-4, 6);
  });
});

// --- 2. Force and load torque -------------------------------------------------

describe("resolveDriveForce", () => {
  it("reduces to Atlanta's/Andantex's own horizontal special case: F = FA + m*g*mu at theta=0", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 10,
      totalMovingMassKg: 50,
      gravityMps2: G,
      inclineAngleRad: 0,
      frictionCoefficient: 0.15,
    });
    expect(forceN).toBeCloseTo(10 + 50 * G * 0.15, 9);
  });

  it("reduces to Atlanta's/Andantex's own vertical special case: F = FA + m*g at theta=pi/2 (friction term vanishes)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 10,
      totalMovingMassKg: 50,
      gravityMps2: G,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.15,
    });
    expect(forceN).toBeCloseTo(10 + 50 * G, 9);
  });

  it("is identical in shape to ball-screw-motor-sizing's own resolveDriveForce (same source page)", () => {
    // F = F_A + m*g*(sin(theta)+mu*cos(theta)) at an intermediate incline.
    const theta = Math.PI / 6;
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 20,
      gravityMps2: G,
      inclineAngleRad: theta,
      frictionCoefficient: 0.1,
    });
    const expected =
      20 * G * (Math.sin(theta) + 0.1 * Math.cos(theta));
    expect(forceN).toBeCloseTo(expected, 9);
  });

  it("rejects a negative total moving mass or non-positive gravity", () => {
    expect(() =>
      resolveDriveForce({
        externalForceN: 0,
        totalMovingMassKg: -1,
        gravityMps2: G,
        inclineAngleRad: 0,
        frictionCoefficient: 0.1,
      }),
    ).toThrow(RackPinionMotorSizingInputError);
  });
});

describe("resolveLoadTorque", () => {
  it("returns F*D/(2*eta*i)", () => {
    const { loadTorqueNm } = resolveLoadTorque({
      forceN: 100,
      pinionPitchDiameterM: 0.08,
      mechanicalEfficiency: 0.9,
      gearRatio: 2,
    });
    expect(loadTorqueNm).toBeCloseTo((100 * 0.08) / (2 * 0.9 * 2), 9);
  });

  it("rejects mechanical efficiency outside (0, 1]", () => {
    expect(() =>
      resolveLoadTorque({
        forceN: 10,
        pinionPitchDiameterM: 0.1,
        mechanicalEfficiency: 1.1,
        gearRatio: 1,
      }),
    ).toThrow(RackPinionMotorSizingInputError);
  });

  it("rejects a non-positive gear ratio", () => {
    expect(() =>
      resolveLoadTorque({
        forceN: 10,
        pinionPitchDiameterM: 0.1,
        mechanicalEfficiency: 1,
        gearRatio: 0,
      }),
    ).toThrow(RackPinionMotorSizingInputError);
  });
});

// --- 3. Operating speed and acceleration torque -------------------------------

describe("resolveOperatingSpeed", () => {
  it("reproduces Andantex's own Np = V*19100/d (mm) worked-procedure figure", () => {
    // V=1.2 m/s, d=80mm, i=1 -> Np=286.5 rpm (Andantex's own approximate
    // 19100 constant, itself an approximation of 60000/pi -- reproduced
    // here from the exact SI relationship, matching within Andantex's own
    // constant's rounding).
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetVelocityMps: 1.2,
      pinionPitchDiameterM: 0.08,
      gearRatio: 1,
    });
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    expect(rpm).toBeCloseTo(286.5, 0);
  });

  it("scales linearly with gear ratio", () => {
    const direct = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pinionPitchDiameterM: 0.1,
      gearRatio: 1,
    });
    const geared = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pinionPitchDiameterM: 0.1,
      gearRatio: 3,
    });
    expect(geared.operatingSpeedRadPerS).toBeCloseTo(
      direct.operatingSpeedRadPerS * 3,
      9,
    );
  });

  it("rejects a non-positive velocity, diameter, or gear ratio", () => {
    expect(() =>
      resolveOperatingSpeed({
        targetVelocityMps: 0,
        pinionPitchDiameterM: 0.1,
        gearRatio: 1,
      }),
    ).toThrow(RackPinionMotorSizingInputError);
  });
});

describe("operating speed + angularAccelerationFromSpeedRamp + accelerationTorque, combined", () => {
  it("computes a positive acceleration torque for a real accelerate-to-speed ramp", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pinionPitchDiameterM: 0.08,
      gearRatio: 1,
    });
    const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: 2,
    });
    const { torqueNm } = accelerationTorque({
      inertiaKgM2: 0.02,
      angularAccelerationRadPerS2,
    });
    expect(torqueNm).toBeCloseTo(0.02 * (operatingSpeedRadPerS / 2), 12);
    expect(torqueNm).toBeGreaterThan(0);
  });
});

// --- 4. Momentary and required torque -------------------------------------------

describe("resolveMomentaryTorque", () => {
  it("returns the plain sum of acceleration and load torque", () => {
    expect(
      resolveMomentaryTorque({ accelerationTorqueNm: 5, loadTorqueNm: 12.2 })
        .momentaryTorqueNm,
    ).toBeCloseTo(17.2, 9);
  });

  it("rejects a negative acceleration or load torque", () => {
    expect(() =>
      resolveMomentaryTorque({ accelerationTorqueNm: -1, loadTorqueNm: 1 }),
    ).toThrow(RackPinionMotorSizingInputError);
  });
});

describe("resolveRequiredTorque", () => {
  it("multiplies the computed torque by the safety factor", () => {
    expect(
      resolveRequiredTorque({ computedTorqueNm: 17.2, safetyFactor: 2.5 })
        .requiredTorqueNm,
    ).toBeCloseTo(43, 9);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolveRequiredTorque({ computedTorqueNm: 17.2, safetyFactor: 0.9 }),
    ).toThrow(RackPinionMotorSizingInputError);
  });
});

// --- 5. Andantex Tp = Fr*d/2 cross-check, kernel level -------------------------

describe("end-to-end: Andantex USA, Inc.'s own worked-procedure figures", () => {
  it("reproduces Fr, Tp, and Np for a representative horizontal scenario", () => {
    const M = 100;
    const mu = 0.2;
    const ta = 0.5;
    const V = 1.2;
    const F = 50;
    const D = 0.08;

    const { forceN } = resolveDriveForce({
      externalForceN: F,
      totalMovingMassKg: M,
      gravityMps2: G,
      inclineAngleRad: 0,
      frictionCoefficient: mu,
    });
    // Andantex's own Fr = mu*M*g+M*a+F folds M*a into the force term
    // directly; this module's own resolveDriveForce does not (a=V/ta is
    // handled by acceleration_torque separately) -- so Fr itself is
    // compared against forceN + M*a here, not forceN alone.
    const a = V / ta;
    const FrExpected = mu * M * G + M * a + F;
    expect(forceN + M * a).toBeCloseTo(FrExpected, 6);

    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      pinionPitchDiameterM: D,
      mechanicalEfficiency: 1,
      gearRatio: 1,
    });
    const r = D / 2;
    // Tp (Andantex, torque from the COMBINED Fr) vs this module's own
    // load_torque (torque from the static force only) + a separately
    // computed acceleration torque -- verified equal in sum.
    const accelerationTorqueNm = M * r * r * (a / r); // pinion mass -> 0 limit
    const momentaryTorqueNm = loadTorqueNm + accelerationTorqueNm;
    const TpExpected = (FrExpected * D) / 2;
    expect(momentaryTorqueNm).toBeCloseTo(TpExpected, 6);

    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetVelocityMps: V,
      pinionPitchDiameterM: D,
      gearRatio: 1,
    });
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    expect(rpm).toBeCloseTo(286.5, 0);
  });
});
