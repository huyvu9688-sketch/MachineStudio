import { describe, expect, it } from "vitest";
import { DirectDriveConveyorMotorSizingInputError } from "./math";
import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  resolveFrictionForce,
  resolveInertiaRatio,
  resolveLinearMassInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolveReflectedIdlerInertia,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveRollerInertia,
  resolveTotalSystemInertia,
} from "./math";

// Unit conversion constants used only by these tests, to reproduce
// Oriental Motor Co., Ltd.'s own General Catalog Technical Reference
// worked examples (imperial units) in SI -- the same literal-conversion
// pattern ball-screw-motor-sizing/0.1.0/math.test.ts already establishes
// for its own Rockford-sourced cross-check.
const LB_TO_KG = 0.45359237;
const OZ_TO_KG = LB_TO_KG / 16;
const IN_TO_M = 0.0254;
const OZF_TO_N = 4.4482216152605 / 16;
const G = 9.80665;

// --- 1. Inertia --------------------------------------------------------------

describe("resolveRollerInertia", () => {
  it("returns (1/8)*M*D^2, matching lib/engine/mechanics directly", () => {
    expect(
      resolveRollerInertia({ massKg: 1, diameterM: 0.1016 }).inertiaKgM2,
    ).toBeCloseTo((1 * 0.1016 ** 2) / 8, 15);
  });

  it("reproduces Oriental Motor's own p. F-9 Jm1 = 70.4 oz-in^2 single-roller figure", () => {
    // General Catalog Technical Reference p. F-9: m1=2.2 lb (per roller),
    // D=4 in -> Jm1 = 1/8 * 2.2*16 * 4^2 = 70.4 oz-in^2.
    const { inertiaKgM2 } = resolveRollerInertia({
      massKg: 2.2 * LB_TO_KG,
      diameterM: 4 * IN_TO_M,
    });
    const expectedKgM2 = 70.4 * OZ_TO_KG * IN_TO_M ** 2;
    expect(inertiaKgM2).toBeCloseTo(expectedKgM2, 6);
  });

  it("rejects a non-positive diameter", () => {
    expect(() => resolveRollerInertia({ massKg: 1, diameterM: 0 })).toThrow(
      DirectDriveConveyorMotorSizingInputError,
    );
  });

  it("rejects a non-positive mass", () => {
    expect(() =>
      resolveRollerInertia({ massKg: 0, diameterM: 0.1 }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

describe("resolveReflectedIdlerInertia", () => {
  it("passes the idler's own inertia through unchanged when both diameters are equal", () => {
    const { reflectedIdlerInertiaKgM2 } = resolveReflectedIdlerInertia({
      idlerInertiaOwnKgM2: 1.29e-3,
      driveRollerDiameterM: 0.1016,
      idlerRollerDiameterM: 0.1016,
    });
    expect(reflectedIdlerInertiaKgM2).toBeCloseTo(1.29e-3, 12);
  });

  it("scales by (D1/D2)^2 when the idler has a different diameter", () => {
    const { reflectedIdlerInertiaKgM2 } = resolveReflectedIdlerInertia({
      idlerInertiaOwnKgM2: 1e-3,
      driveRollerDiameterM: 0.2,
      idlerRollerDiameterM: 0.1,
    });
    expect(reflectedIdlerInertiaKgM2).toBeCloseTo(1e-3 * (0.2 / 0.1) ** 2, 12);
  });

  it("rejects a non-positive drive or idler diameter", () => {
    expect(() =>
      resolveReflectedIdlerInertia({
        idlerInertiaOwnKgM2: 1e-3,
        driveRollerDiameterM: 0,
        idlerRollerDiameterM: 0.1,
      }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

describe("resolveLinearMassInertia", () => {
  it("returns m*(D1/2)^2, algebraically identical to Omron's own M*D1^2/4 term", () => {
    const { inertiaKgM2 } = resolveLinearMassInertia({
      massKg: 5,
      driveRollerDiameterM: 0.2,
    });
    expect(inertiaKgM2).toBeCloseTo(5 * (0.2 / 2) ** 2, 12);
    expect(inertiaKgM2).toBeCloseTo((5 * 0.2 ** 2) / 4, 12);
  });

  it("reproduces Oriental Motor's own p. F-8 J2 = 1920 oz-in^2 belt+work figure", () => {
    // General Catalog Technical Reference p. F-8: m1=30 lb (belt+work),
    // D=4 in -> J2 = 30*16*(4/2)^2 = 1920 oz-in^2.
    const { inertiaKgM2 } = resolveLinearMassInertia({
      massKg: 30 * LB_TO_KG,
      driveRollerDiameterM: 4 * IN_TO_M,
    });
    const expectedKgM2 = 1920 * OZ_TO_KG * IN_TO_M ** 2;
    expect(inertiaKgM2).toBeCloseTo(expectedKgM2, 6);
  });

  it("returns exactly 0 for a zero mass, without calling into lib/engine/mechanics", () => {
    expect(
      resolveLinearMassInertia({ massKg: 0, driveRollerDiameterM: 0.2 })
        .inertiaKgM2,
    ).toBe(0);
  });

  it("rejects a negative mass", () => {
    expect(() =>
      resolveLinearMassInertia({ massKg: -1, driveRollerDiameterM: 0.2 }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

describe("resolveReflectedLoadInertia / resolveTotalSystemInertia / resolveInertiaRatio", () => {
  it("sums the three reflected terms, then adds the motor rotor and drive-roller inertia", () => {
    const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
      reflectedIdlerInertiaKgM2: 1e-3,
      beltInertiaKgM2: 2e-3,
      loadInertiaKgM2: 3e-3,
    });
    expect(reflectedLoadInertiaKgM2).toBeCloseTo(6e-3, 12);

    const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1e-5,
      driveRollerInertiaKgM2: 5e-4,
      reflectedLoadInertiaKgM2,
    });
    expect(totalSystemInertiaKgM2).toBeCloseTo(1e-5 + 5e-4 + 6e-3, 12);

    const { inertiaRatio } = resolveInertiaRatio({
      reflectedLoadInertiaKgM2,
      motorRotorInertiaKgM2: 1e-5,
    });
    expect(inertiaRatio).toBeCloseTo(6e-3 / 1e-5, 6);
  });
});

// --- 2. Friction force and load torque ----------------------------------------

describe("resolveFrictionForce", () => {
  it("returns mu*(belt+load)*g", () => {
    const { forceN } = resolveFrictionForce({
      beltFrictionCoefficient: 0.3,
      beltMassKg: 2,
      carriedLoadMassKg: 8,
    });
    expect(forceN).toBeCloseTo(0.3 * 10 * G, 9);
  });

  it("is zero when both belt and carried-load mass are zero", () => {
    const { forceN } = resolveFrictionForce({
      beltFrictionCoefficient: 0.3,
      beltMassKg: 0,
      carriedLoadMassKg: 0,
    });
    expect(forceN).toBe(0);
  });

  it("accepts a friction coefficient greater than 1 (no upper cap)", () => {
    const { forceN } = resolveFrictionForce({
      beltFrictionCoefficient: 1.5,
      beltMassKg: 1,
      carriedLoadMassKg: 0,
    });
    expect(forceN).toBeCloseTo(1.5 * G, 9);
  });

  it("rejects a negative friction coefficient", () => {
    expect(() =>
      resolveFrictionForce({
        beltFrictionCoefficient: -0.1,
        beltMassKg: 1,
        carriedLoadMassKg: 0,
      }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

describe("resolveLoadTorque", () => {
  it("reproduces Oriental Motor's own p. F-8 TL = 320 oz-in worked example", () => {
    // m1=30 lb, mu=0.3, D=4 in, eta=0.9.
    const { forceN } = resolveFrictionForce({
      beltFrictionCoefficient: 0.3,
      beltMassKg: 0,
      carriedLoadMassKg: 30 * LB_TO_KG,
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      driveRollerDiameterM: 4 * IN_TO_M,
      mechanicalEfficiency: 0.9,
    });
    const expectedNm = 320 * OZF_TO_N * IN_TO_M;
    expect(loadTorqueNm).toBeCloseTo(expectedNm, 4);
  });

  it("reproduces Oriental Motor's own p. F-9 TL = 22 lb-in worked example", () => {
    // m2=33 lb, mu=0.3, D=4 in, eta=0.9.
    const { forceN } = resolveFrictionForce({
      beltFrictionCoefficient: 0.3,
      beltMassKg: 0,
      carriedLoadMassKg: 33 * LB_TO_KG,
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      driveRollerDiameterM: 4 * IN_TO_M,
      mechanicalEfficiency: 0.9,
    });
    const lbfToN = 4.4482216152605;
    const expectedNm = 22 * lbfToN * IN_TO_M;
    expect(loadTorqueNm).toBeCloseTo(expectedNm, 4);
  });

  it("rejects mechanical efficiency outside (0, 1]", () => {
    expect(() =>
      resolveLoadTorque({
        forceN: 10,
        driveRollerDiameterM: 0.1,
        mechanicalEfficiency: 1.1,
      }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

// --- 3. Operating speed and acceleration torque -------------------------------

describe("resolveOperatingSpeed", () => {
  it("reproduces Oriental Motor's own p. F-8 NG = 33.4 r/min worked example", () => {
    // V=7 in/s, D=4 in -> NG = V*60/(pi*D) = 33.4 r/min.
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetBeltSpeedMps: 7 * IN_TO_M,
      driveRollerDiameterM: 4 * IN_TO_M,
    });
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    expect(rpm).toBeCloseTo(33.4, 1);
  });

  it("rejects a non-positive speed or diameter", () => {
    expect(() =>
      resolveOperatingSpeed({
        targetBeltSpeedMps: 0,
        driveRollerDiameterM: 0.1,
      }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

describe("operating speed + angularAccelerationFromSpeedRamp + accelerationTorque, combined", () => {
  it("computes a positive acceleration torque for a real accelerate-to-speed ramp", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetBeltSpeedMps: 0.5,
      driveRollerDiameterM: 0.2,
    });
    const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: 2,
    });
    expect(angularAccelerationRadPerS2).toBeCloseTo(
      operatingSpeedRadPerS / 2,
      12,
    );
    const { torqueNm } = accelerationTorque({
      inertiaKgM2: 0.01,
      angularAccelerationRadPerS2,
    });
    expect(torqueNm).toBeCloseTo(0.01 * (operatingSpeedRadPerS / 2), 12);
    expect(torqueNm).toBeGreaterThan(0);
  });

  it("a longer acceleration time reduces acceleration torque (monotonicity)", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetBeltSpeedMps: 0.5,
      driveRollerDiameterM: 0.2,
    });
    const fast = accelerationTorque({
      inertiaKgM2: 0.01,
      angularAccelerationRadPerS2: angularAccelerationFromSpeedRamp({
        angularVelocityChangeRadPerS: operatingSpeedRadPerS,
        rampTimeS: 1,
      }).angularAccelerationRadPerS2,
    }).torqueNm;
    const slow = accelerationTorque({
      inertiaKgM2: 0.01,
      angularAccelerationRadPerS2: angularAccelerationFromSpeedRamp({
        angularVelocityChangeRadPerS: operatingSpeedRadPerS,
        rampTimeS: 5,
      }).angularAccelerationRadPerS2,
    }).torqueNm;
    expect(slow).toBeLessThan(fast);
  });
});

// --- 4. Momentary and required torque -------------------------------------------

describe("resolveMomentaryTorque", () => {
  it("returns the plain sum of acceleration and load torque", () => {
    expect(
      resolveMomentaryTorque({ accelerationTorqueNm: 0.5, loadTorqueNm: 2.26 })
        .momentaryTorqueNm,
    ).toBeCloseTo(2.76, 9);
  });

  it("rejects a negative acceleration or load torque", () => {
    expect(() =>
      resolveMomentaryTorque({ accelerationTorqueNm: -0.1, loadTorqueNm: 1 }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

describe("resolveRequiredTorque", () => {
  it("multiplies the computed torque by the safety factor", () => {
    expect(
      resolveRequiredTorque({ computedTorqueNm: 2.26, safetyFactor: 2 })
        .requiredTorqueNm,
    ).toBeCloseTo(4.52, 9);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolveRequiredTorque({ computedTorqueNm: 2.26, safetyFactor: 0.9 }),
    ).toThrow(DirectDriveConveyorMotorSizingInputError);
  });
});

// --- 5. End-to-end reproduction of Oriental Motor's own p. F-8 worked example --

describe("end-to-end: Oriental Motor Co., Ltd.'s own 'Belt and Pully' worked example (p. F-8)", () => {
  it("reproduces the load torque, on-shaft inertia sum, and operating speed through this module's own kernel", () => {
    // General Catalog Technical Reference p. F-8. Both rollers share one
    // diameter (D=4 in) and mass (m2=35.27 oz each); belt+work combined
    // mass m1=30 lb is modeled here as carried_load_mass, with belt_mass=0
    // -- the source itself never splits the two, and both this module's
    // own load-torque and inertia formulas are linear in (belt+load) mass,
    // so the split is immaterial to every figure checked here.
    const driveRollerDiameterM = 4 * IN_TO_M;
    const rollerMassKg = 35.27 * OZ_TO_KG;

    const { inertiaKgM2: driveRollerInertiaKgM2 } = resolveRollerInertia({
      massKg: rollerMassKg,
      diameterM: driveRollerDiameterM,
    });
    const { inertiaKgM2: idlerInertiaOwnKgM2 } = resolveRollerInertia({
      massKg: rollerMassKg,
      diameterM: driveRollerDiameterM,
    });
    const { reflectedIdlerInertiaKgM2 } = resolveReflectedIdlerInertia({
      idlerInertiaOwnKgM2,
      driveRollerDiameterM,
      idlerRollerDiameterM: driveRollerDiameterM,
    });
    const { inertiaKgM2: loadInertiaKgM2 } = resolveLinearMassInertia({
      massKg: 30 * LB_TO_KG,
      driveRollerDiameterM,
    });
    const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
      reflectedIdlerInertiaKgM2,
      beltInertiaKgM2: 0,
      loadInertiaKgM2,
    });

    const onShaftInertiaKgM2 = driveRollerInertiaKgM2 + reflectedLoadInertiaKgM2;
    const expectedOnShaftInertiaKgM2 = 2061 * OZ_TO_KG * IN_TO_M ** 2;
    expect(onShaftInertiaKgM2).toBeCloseTo(expectedOnShaftInertiaKgM2, 5);

    const { forceN } = resolveFrictionForce({
      beltFrictionCoefficient: 0.3,
      beltMassKg: 0,
      carriedLoadMassKg: 30 * LB_TO_KG,
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      driveRollerDiameterM,
      mechanicalEfficiency: 0.9,
    });
    expect(loadTorqueNm).toBeCloseTo(320 * OZF_TO_N * IN_TO_M, 4);

    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetBeltSpeedMps: 7 * IN_TO_M,
      driveRollerDiameterM,
    });
    const rpm = (operatingSpeedRadPerS * 60) / (2 * Math.PI);
    expect(rpm).toBeCloseTo(33.4, 1);
  });
});
