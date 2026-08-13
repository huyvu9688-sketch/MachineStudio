import { describe, expect, it } from "vitest";
import { BeltPulleyMotorSizingInputError } from "./math";
import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  resolveBeltInertia,
  resolveDriveForce,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolvePulleyInertia,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveTotalSystemInertia,
} from "./math";

const G = 9.80665;

// --- 1. Inertia --------------------------------------------------------------

describe("resolvePulleyInertia", () => {
  it("returns (1/8)*(M_drive+M_idler)*D^2, matching lib/engine/mechanics directly", () => {
    const { inertiaKgM2 } = resolvePulleyInertia({
      pulleyMassKg: 1,
      idlerPulleyMassKg: 1.5,
      pulleyPitchDiameterM: 0.1,
    });
    expect(inertiaKgM2).toBeCloseTo(
      (1 * 0.1 ** 2) / 8 + (1.5 * 0.1 ** 2) / 8,
      15,
    );
  });

  it("adds the two pulleys directly (no speed-ratio reduction) -- doubling one pulley's mass adds exactly its own share", () => {
    const equal = resolvePulleyInertia({
      pulleyMassKg: 2,
      idlerPulleyMassKg: 2,
      pulleyPitchDiameterM: 0.1,
    });
    const onePulley = resolvePulleyInertia({
      pulleyMassKg: 2,
      idlerPulleyMassKg: 1e-12,
      pulleyPitchDiameterM: 0.1,
    });
    expect(equal.inertiaKgM2).toBeCloseTo(onePulley.inertiaKgM2 * 2, 6);
  });

  it("rejects a non-positive pulley mass or diameter", () => {
    expect(() =>
      resolvePulleyInertia({
        pulleyMassKg: 0,
        idlerPulleyMassKg: 1,
        pulleyPitchDiameterM: 0.1,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
    expect(() =>
      resolvePulleyInertia({
        pulleyMassKg: 1,
        idlerPulleyMassKg: 1,
        pulleyPitchDiameterM: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

describe("resolveBeltInertia", () => {
  it("returns M_belt*(D/2)^2 for a nonzero belt mass", () => {
    const { inertiaKgM2 } = resolveBeltInertia({
      beltMassKg: 3,
      pulleyPitchDiameterM: 0.1,
    });
    expect(inertiaKgM2).toBeCloseTo(3 * (0.1 / 2) ** 2, 12);
  });

  it("returns exactly 0 when belt mass is 0 (the registry's own default)", () => {
    const { inertiaKgM2 } = resolveBeltInertia({
      beltMassKg: 0,
      pulleyPitchDiameterM: 0.1,
    });
    expect(inertiaKgM2).toBe(0);
  });

  it("rejects a negative belt mass or non-positive diameter", () => {
    expect(() =>
      resolveBeltInertia({ beltMassKg: -1, pulleyPitchDiameterM: 0.1 }),
    ).toThrow(BeltPulleyMotorSizingInputError);
    expect(() =>
      resolveBeltInertia({ beltMassKg: 1, pulleyPitchDiameterM: 0 }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

describe("resolveLoadInertia", () => {
  it("returns pulleyInertia + beltInertia + m*(D/2)^2", () => {
    const { loadInertiaKgM2 } = resolveLoadInertia({
      pulleyInertiaKgM2: 1e-4,
      beltInertiaKgM2: 2e-5,
      totalMovingMassKg: 50,
      pulleyPitchDiameterM: 0.08,
    });
    expect(loadInertiaKgM2).toBeCloseTo(1e-4 + 2e-5 + 50 * (0.08 / 2) ** 2, 12);
  });

  it("rejects a non-positive mass or diameter", () => {
    expect(() =>
      resolveLoadInertia({
        pulleyInertiaKgM2: 1e-4,
        beltInertiaKgM2: 0,
        totalMovingMassKg: 0,
        pulleyPitchDiameterM: 0.08,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
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
    expect(inertiaRatio).toBeCloseTo(0.08 / 16 / 1e-4, 6);
  });
});

// --- 2. Force and load torque -------------------------------------------------

describe("resolveDriveForce", () => {
  it("reduces to the horizontal special case: F = FA + m*g*mu at theta=0", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 10,
      totalMovingMassKg: 50,
      gravityMps2: G,
      inclineAngleRad: 0,
      frictionCoefficient: 0.15,
    });
    expect(forceN).toBeCloseTo(10 + 50 * G * 0.15, 9);
  });

  it("reduces to the vertical special case: F = FA + m*g at theta=pi/2 (friction term vanishes)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 10,
      totalMovingMassKg: 50,
      gravityMps2: G,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.15,
    });
    expect(forceN).toBeCloseTo(10 + 50 * G, 9);
  });

  it("is identical in shape to rack-pinion-motor-sizing's own resolveDriveForce (same source page)", () => {
    const theta = Math.PI / 6;
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 20,
      gravityMps2: G,
      inclineAngleRad: theta,
      frictionCoefficient: 0.1,
    });
    const expected = 20 * G * (Math.sin(theta) + 0.1 * Math.cos(theta));
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
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

describe("resolveLoadTorque", () => {
  it("returns F*D/(2*eta*i)", () => {
    const { loadTorqueNm } = resolveLoadTorque({
      forceN: 100,
      pulleyPitchDiameterM: 0.08,
      mechanicalEfficiency: 0.9,
      gearRatio: 2,
    });
    expect(loadTorqueNm).toBeCloseTo((100 * 0.08) / (2 * 0.9 * 2), 9);
  });

  it("rejects mechanical efficiency outside (0, 1]", () => {
    expect(() =>
      resolveLoadTorque({
        forceN: 10,
        pulleyPitchDiameterM: 0.1,
        mechanicalEfficiency: 1.1,
        gearRatio: 1,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });

  it("rejects a non-positive gear ratio", () => {
    expect(() =>
      resolveLoadTorque({
        forceN: 10,
        pulleyPitchDiameterM: 0.1,
        mechanicalEfficiency: 1,
        gearRatio: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

// --- 3. Operating speed and acceleration torque -------------------------------

describe("resolveOperatingSpeed", () => {
  it("computes omega_pulley = V/(D/2), then scales by gear ratio", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pulleyPitchDiameterM: 0.1,
      gearRatio: 1,
    });
    expect(operatingSpeedRadPerS).toBeCloseTo(0.5 / 0.05, 9);
  });

  it("scales linearly with gear ratio", () => {
    const direct = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pulleyPitchDiameterM: 0.1,
      gearRatio: 1,
    });
    const geared = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pulleyPitchDiameterM: 0.1,
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
        pulleyPitchDiameterM: 0.1,
        gearRatio: 1,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

describe("operating speed + angularAccelerationFromSpeedRamp + accelerationTorque, combined", () => {
  it("computes a positive acceleration torque for a real accelerate-to-speed ramp", () => {
    const { operatingSpeedRadPerS } = resolveOperatingSpeed({
      targetVelocityMps: 0.5,
      pulleyPitchDiameterM: 0.08,
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
    ).toThrow(BeltPulleyMotorSizingInputError);
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
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});
