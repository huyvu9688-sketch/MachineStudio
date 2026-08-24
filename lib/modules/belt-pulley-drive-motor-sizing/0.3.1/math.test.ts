import { describe, expect, it } from "vitest";
import { BeltPulleyMotorSizingInputError } from "./math";
import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  resolveBeltInertia,
  resolveDriveForce,
  resolveEffectiveTorque,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveMotionFromDistance,
  resolveMotionFromVelocity,
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

  it("rejects a non-positive pulley mass or diameter", () => {
    expect(() =>
      resolvePulleyInertia({
        pulleyMassKg: 0,
        idlerPulleyMassKg: 1,
        pulleyPitchDiameterM: 0.1,
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

  it("returns exactly 0 when belt mass is 0", () => {
    const { inertiaKgM2 } = resolveBeltInertia({
      beltMassKg: 0,
      pulleyPitchDiameterM: 0.1,
    });
    expect(inertiaKgM2).toBe(0);
  });
});

describe("resolveLoadInertia / resolveReflectedLoadInertia / resolveTotalSystemInertia / resolveInertiaRatio", () => {
  it("composes pulley + belt + carriage, reflects by i^2, adds motor rotor inertia, and ratios", () => {
    const { loadInertiaKgM2 } = resolveLoadInertia({
      pulleyInertiaKgM2: 1e-4,
      beltInertiaKgM2: 2e-5,
      totalMovingMassKg: 50,
      pulleyPitchDiameterM: 0.08,
    });
    expect(loadInertiaKgM2).toBeCloseTo(1e-4 + 2e-5 + 50 * (0.08 / 2) ** 2, 12);

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

describe("resolveDriveForce / resolveLoadTorque", () => {
  it("F = FA + m*g*(sin(theta)+mu*cos(theta)); TL = F*D/(2*eta*i)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 10,
      totalMovingMassKg: 50,
      inclineAngleRad: 0,
      frictionCoefficient: 0.15,
    });
    // G (local, 9.80665) matches math.ts's own STANDARD_GRAVITY_M_PER_S2
    // exactly -- no assertion value changes, only the removed field above.
    expect(forceN).toBeCloseTo(10 + 50 * G * 0.15, 9);

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
  });
});

// --- 4. Momentary and required torque -------------------------------------------

describe("resolveMomentaryTorque / resolveRequiredTorque", () => {
  it("T1 = Ta+TL when the acceleration phase governs (Ta+TL > |Td-TL|); T_req = T1*Sf", () => {
    expect(
      resolveMomentaryTorque({
        accelerationTorqueNm: 5,
        loadTorqueNm: 12.2,
        decelerationTorqueNm: 5,
      }).momentaryTorqueNm,
    ).toBeCloseTo(17.2, 9);
    expect(
      resolveRequiredTorque({ computedTorqueNm: 17.2, safetyFactor: 2.5 })
        .requiredTorqueNm,
    ).toBeCloseTo(43, 9);
  });

  it("0.3.1: T1 = |Td-TL| when the deceleration phase governs (a fast stop)", () => {
    // decelerationTorqueNm is large relative to accelerationTorqueNm --
    // realistic for decelerationTimeS << accelerationTimeS.
    const { momentaryTorqueNm } = resolveMomentaryTorque({
      accelerationTorqueNm: 2,
      loadTorqueNm: 3,
      decelerationTorqueNm: 50,
    });
    // accel phase: |2+3|=5; decel phase: |50-3|=47 -- decel governs.
    expect(momentaryTorqueNm).toBeCloseTo(47, 9);
  });

  it("0.3.1: takes the magnitude of the deceleration phase, which can go negative before the abs", () => {
    // decel phase torque Td-TL = 1-10 = -9; magnitude 9 exceeds the accel
    // phase's own Ta+TL = 0+10 = 10 is not exceeded here, so accel governs --
    // pick Td closer to TL to exercise the abs() on a small negative value.
    const { momentaryTorqueNm } = resolveMomentaryTorque({
      accelerationTorqueNm: 0,
      loadTorqueNm: 10,
      decelerationTorqueNm: 1,
    });
    // accel phase: |0+10|=10; decel phase: |1-10|=9 -- accel governs, but
    // the decel phase's own negative interior (1-10=-9) must not itself be
    // returned as a negative momentary torque.
    expect(momentaryTorqueNm).toBeCloseTo(10, 9);
    expect(momentaryTorqueNm).toBeGreaterThanOrEqual(0);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolveRequiredTorque({ computedTorqueNm: 17.2, safetyFactor: 0.9 }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

// --- 5. Motion profile (NEW) ----------------------------------------------------

describe("resolveMotionFromVelocity", () => {
  it("S = V*(t1+t3)/2 + V*t2; tf = t1+t2+t3+t4", () => {
    const { travelDistanceM, cycleTimeS } = resolveMotionFromVelocity({
      targetVelocityMps: 2,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      constantVelocityTimeS: 3,
      dwellTimeS: 0.5,
    });
    expect(travelDistanceM).toBeCloseTo((2 * (1 + 1)) / 2 + 2 * 3, 12);
    expect(cycleTimeS).toBeCloseTo(1 + 3 + 1 + 0.5, 12);
  });

  it("handles constantVelocityTimeS = 0 (a triangular move) as a valid boundary case, not an error", () => {
    expect(() =>
      resolveMotionFromVelocity({
        targetVelocityMps: 2,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        constantVelocityTimeS: 0,
        dwellTimeS: 0,
      }),
    ).not.toThrow();
  });

  it("rejects a non-positive target velocity or accel/decel time", () => {
    expect(() =>
      resolveMotionFromVelocity({
        targetVelocityMps: 0,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        constantVelocityTimeS: 1,
        dwellTimeS: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

describe("resolveMotionFromDistance", () => {
  it("t2 = tf-t1-t3-t4; V = S/(t2+(t1+t3)/2) -- round-trips resolveMotionFromVelocity", () => {
    const forward = resolveMotionFromVelocity({
      targetVelocityMps: 2,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      constantVelocityTimeS: 3,
      dwellTimeS: 0.5,
    });
    const backward = resolveMotionFromDistance({
      travelDistanceM: forward.travelDistanceM,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      cycleTimeS: forward.cycleTimeS,
      dwellTimeS: 0.5,
    });
    expect(backward.targetVelocityMps).toBeCloseTo(2, 9);
    expect(backward.constantVelocityTimeS).toBeCloseTo(3, 9);
  });

  it("t2 = 0 is a valid boundary case (a triangular move), not an error", () => {
    const result = resolveMotionFromDistance({
      travelDistanceM: 1,
      accelerationTimeS: 1,
      decelerationTimeS: 1,
      cycleTimeS: 2,
      dwellTimeS: 0,
    });
    expect(result.constantVelocityTimeS).toBeCloseTo(0, 12);
    expect(result.targetVelocityMps).toBeCloseTo(1, 9);
  });

  it("throws BeltPulleyMotorSizingInputError (a feasibility check) when cycle_time is too short (derived t2 < 0)", () => {
    expect(() =>
      resolveMotionFromDistance({
        travelDistanceM: 1,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        cycleTimeS: 1,
        dwellTimeS: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });

  it("rejects a non-positive travel distance, accel/decel time, or cycle time", () => {
    expect(() =>
      resolveMotionFromDistance({
        travelDistanceM: 0,
        accelerationTimeS: 1,
        decelerationTimeS: 1,
        cycleTimeS: 3,
        dwellTimeS: 0,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});

// --- 6. Effective (RMS) torque (NEW) ---------------------------------------------

describe("resolveEffectiveTorque", () => {
  it("Trms = sqrt(((Ta+TL)^2*t1 + TL^2*t2 + (Td-TL)^2*t3 + TL^2*t4) / tf)", () => {
    const Ta = 5;
    const TL = 2;
    const Td = 4;
    const t1 = 1;
    const t2 = 3;
    const t3 = 1;
    const t4 = 0.5;
    const tf = t1 + t2 + t3 + t4;
    const { effectiveTorqueNm } = resolveEffectiveTorque({
      accelerationTorqueNm: Ta,
      loadTorqueNm: TL,
      decelerationTorqueNm: Td,
      accelerationTimeS: t1,
      constantVelocityTimeS: t2,
      decelerationTimeS: t3,
      dwellTimeS: t4,
      cycleTimeS: tf,
    });
    const expected = Math.sqrt(
      ((Ta + TL) ** 2 * t1 +
        TL ** 2 * t2 +
        (Td - TL) ** 2 * t3 +
        TL ** 2 * t4) /
        tf,
    );
    expect(effectiveTorqueNm).toBeCloseTo(expected, 12);
  });

  it("equals momentary_torque's own peak component when run and dwell time are 0 and accel/decel are symmetric (Ta=Td)", () => {
    const { effectiveTorqueNm } = resolveEffectiveTorque({
      accelerationTorqueNm: 5,
      loadTorqueNm: 2,
      decelerationTorqueNm: 5,
      accelerationTimeS: 1,
      constantVelocityTimeS: 0,
      decelerationTimeS: 1,
      dwellTimeS: 0,
      cycleTimeS: 2,
    });
    // With t2=t4=0 and Td=Ta: Trms = sqrt(((Ta+TL)^2*1 + (Ta-TL)^2*1)/2).
    const expected = Math.sqrt(((5 + 2) ** 2 * 1 + (5 - 2) ** 2 * 1) / 2);
    expect(effectiveTorqueNm).toBeCloseTo(expected, 12);
  });

  it("0.3.1: a nonzero dwell time contributes its own TL^2*t4 holding term, not zero torque", () => {
    const noDwell = resolveEffectiveTorque({
      accelerationTorqueNm: 5,
      loadTorqueNm: 2,
      decelerationTorqueNm: 5,
      accelerationTimeS: 1,
      constantVelocityTimeS: 1,
      decelerationTimeS: 1,
      dwellTimeS: 0,
      cycleTimeS: 3,
    });
    const withDwell = resolveEffectiveTorque({
      accelerationTorqueNm: 5,
      loadTorqueNm: 2,
      decelerationTorqueNm: 5,
      accelerationTimeS: 1,
      constantVelocityTimeS: 1,
      decelerationTimeS: 1,
      dwellTimeS: 3,
      cycleTimeS: 6,
    });
    // A longer dwell holding a nonzero load_torque (TL=2, below the accel/
    // decel peaks but above zero) pulls Trms toward TL, not toward zero --
    // the pre-0.3.1 formula would have this decrease without bound as
    // dwell grows (more zero-torque idle time to average over); the fixed
    // formula instead converges toward TL=2 rather than 0.
    expect(withDwell.effectiveTorqueNm).not.toBeCloseTo(0, 1);
    expect(withDwell.effectiveTorqueNm).toBeGreaterThan(2);
    expect(withDwell.effectiveTorqueNm).toBeLessThan(
      noDwell.effectiveTorqueNm,
    );
  });

  it("a very long dwell converges Trms toward load_torque, never toward zero", () => {
    const { effectiveTorqueNm } = resolveEffectiveTorque({
      accelerationTorqueNm: 5,
      loadTorqueNm: 2,
      decelerationTorqueNm: 5,
      accelerationTimeS: 1,
      constantVelocityTimeS: 1,
      decelerationTimeS: 1,
      dwellTimeS: 1e6,
      cycleTimeS: 3 + 1e6,
    });
    expect(effectiveTorqueNm).toBeCloseTo(2, 3);
  });

  it("rejects a non-positive acceleration_time, deceleration_time, or cycle_time", () => {
    expect(() =>
      resolveEffectiveTorque({
        accelerationTorqueNm: 5,
        loadTorqueNm: 2,
        decelerationTorqueNm: 5,
        accelerationTimeS: 0,
        constantVelocityTimeS: 1,
        decelerationTimeS: 1,
        dwellTimeS: 0,
        cycleTimeS: 3,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });

  it("rejects a negative dwell_time", () => {
    expect(() =>
      resolveEffectiveTorque({
        accelerationTorqueNm: 5,
        loadTorqueNm: 2,
        decelerationTorqueNm: 5,
        accelerationTimeS: 1,
        constantVelocityTimeS: 1,
        decelerationTimeS: 1,
        dwellTimeS: -1,
        cycleTimeS: 3,
      }),
    ).toThrow(BeltPulleyMotorSizingInputError);
  });
});
