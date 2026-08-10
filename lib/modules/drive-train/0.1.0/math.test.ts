import { describe, expect, it } from "vitest";
import {
  DriveTrainInputError,
  resolveAccelerationTorque,
  resolveEffectiveTorque,
  resolveGearboxDeratedLoadTorque,
  resolveInertiaRatio,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolveRegenEnergy,
  resolveTotalSystemInertia,
} from "./math";

// Formula-correctness tests, cross-checked by hand against Omron
// Corporation's own worked numerical example
// (jp.omron.servo_motor_selection_guide@csm-tg-e-3-1, printed pp. 12-13 --
// see ./omron-reference-example.ts for the full scenario and the
// executeModule-level reproduction) wherever the formula participates in
// that example. Boundary/invalid-input tests cover every kernel function.

describe("resolveTotalSystemInertia", () => {
  it("computes J_total = J_M + J_L (Omron's own R88M-U20030 example)", () => {
    const result = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1.23e-5,
      reflectedLoadInertiaKgM2: 1.63e-4,
    });
    expect(result.totalSystemInertiaKgM2).toBeCloseTo(1.753e-4, 9);
  });

  it("rejects a non-positive motor rotor inertia", () => {
    expect(() =>
      resolveTotalSystemInertia({
        motorRotorInertiaKgM2: 0,
        reflectedLoadInertiaKgM2: 1e-4,
      }),
    ).toThrow(DriveTrainInputError);
  });

  it("permits a zero reflected load inertia", () => {
    const result = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1e-5,
      reflectedLoadInertiaKgM2: 0,
    });
    expect(result.totalSystemInertiaKgM2).toBeCloseTo(1e-5, 9);
  });

  it("rejects a negative reflected load inertia", () => {
    expect(() =>
      resolveTotalSystemInertia({
        motorRotorInertiaKgM2: 1e-5,
        reflectedLoadInertiaKgM2: -1,
      }),
    ).toThrow(DriveTrainInputError);
  });
});

describe("resolveInertiaRatio", () => {
  it("computes R_J = J_L / J_M (Omron's own example: ~13.25)", () => {
    const result = resolveInertiaRatio({
      reflectedLoadInertiaKgM2: 1.63e-4,
      motorRotorInertiaKgM2: 1.23e-5,
    });
    expect(result.inertiaRatio).toBeCloseTo(1.63e-4 / 1.23e-5, 6);
  });

  it("rejects a non-positive motor rotor inertia", () => {
    expect(() =>
      resolveInertiaRatio({
        reflectedLoadInertiaKgM2: 1e-4,
        motorRotorInertiaKgM2: 0,
      }),
    ).toThrow(DriveTrainInputError);
  });
});

describe("resolveOperatingSpeed", () => {
  it("computes n = (v/lead)*2*pi*gearRatio (Omron's own example: 1800 rpm)", () => {
    const result = resolveOperatingSpeed({
      linearVelocityMps: 0.3,
      leadM: 0.01,
      gearRatio: 1,
    });
    // 1800 rpm = 1800 * 2*pi/60 rad/s
    expect(result.rotationalSpeedRadPerS).toBeCloseTo(
      1800 * ((2 * Math.PI) / 60),
      6,
    );
  });

  it("scales with gear ratio", () => {
    const direct = resolveOperatingSpeed({
      linearVelocityMps: 0.3,
      leadM: 0.01,
      gearRatio: 1,
    });
    const geared = resolveOperatingSpeed({
      linearVelocityMps: 0.3,
      leadM: 0.01,
      gearRatio: 5,
    });
    expect(geared.rotationalSpeedRadPerS).toBeCloseTo(
      direct.rotationalSpeedRadPerS * 5,
      9,
    );
  });

  it("permits a zero linear velocity", () => {
    const result = resolveOperatingSpeed({
      linearVelocityMps: 0,
      leadM: 0.01,
      gearRatio: 1,
    });
    expect(result.rotationalSpeedRadPerS).toBe(0);
  });

  it("rejects a non-positive lead or gear ratio", () => {
    expect(() =>
      resolveOperatingSpeed({ linearVelocityMps: 0.3, leadM: 0, gearRatio: 1 }),
    ).toThrow(DriveTrainInputError);
    expect(() =>
      resolveOperatingSpeed({
        linearVelocityMps: 0.3,
        leadM: 0.01,
        gearRatio: 0,
      }),
    ).toThrow(DriveTrainInputError);
  });
});

describe("resolveAccelerationTorque", () => {
  it("computes T_A = J_total*alpha (Omron's own example: 0.165 N*m)", () => {
    const result = resolveAccelerationTorque({
      totalSystemInertiaKgM2: 1.753e-4,
      peakAccelerationMps2: 1.5,
      peakDecelerationMps2: 1.5,
      leadM: 0.01,
      gearRatio: 1,
    });
    expect(result.accelerationTorqueNm).toBeCloseTo(0.165, 3);
  });

  it("uses the larger-magnitude of acceleration and deceleration", () => {
    const asymmetric = resolveAccelerationTorque({
      totalSystemInertiaKgM2: 1.753e-4,
      peakAccelerationMps2: 1.5,
      peakDecelerationMps2: 3.0,
      leadM: 0.01,
      gearRatio: 1,
    });
    const symmetricAtDecel = resolveAccelerationTorque({
      totalSystemInertiaKgM2: 1.753e-4,
      peakAccelerationMps2: 3.0,
      peakDecelerationMps2: 3.0,
      leadM: 0.01,
      gearRatio: 1,
    });
    expect(asymmetric.accelerationTorqueNm).toBeCloseTo(
      symmetricAtDecel.accelerationTorqueNm,
      9,
    );
  });

  it("rejects a non-positive total system inertia, lead, or gear ratio", () => {
    expect(() =>
      resolveAccelerationTorque({
        totalSystemInertiaKgM2: 0,
        peakAccelerationMps2: 1,
        peakDecelerationMps2: 1,
        leadM: 0.01,
        gearRatio: 1,
      }),
    ).toThrow(DriveTrainInputError);
    expect(() =>
      resolveAccelerationTorque({
        totalSystemInertiaKgM2: 1e-4,
        peakAccelerationMps2: 1,
        peakDecelerationMps2: 1,
        leadM: 0,
        gearRatio: 1,
      }),
    ).toThrow(DriveTrainInputError);
  });

  it("rejects a negative acceleration or deceleration", () => {
    expect(() =>
      resolveAccelerationTorque({
        totalSystemInertiaKgM2: 1e-4,
        peakAccelerationMps2: -1,
        peakDecelerationMps2: 1,
        leadM: 0.01,
        gearRatio: 1,
      }),
    ).toThrow(DriveTrainInputError);
  });
});

describe("resolveGearboxDeratedLoadTorque", () => {
  it("returns the drive torque unchanged at 100% efficiency (Omron's own example)", () => {
    const result = resolveGearboxDeratedLoadTorque({
      driveTorqueNm: 7.8e-3,
      gearboxEfficiency: 1,
    });
    expect(result.loadTorqueNm).toBeCloseTo(7.8e-3, 9);
  });

  it("inflates the load torque below 100% efficiency", () => {
    const result = resolveGearboxDeratedLoadTorque({
      driveTorqueNm: 10,
      gearboxEfficiency: 0.8,
    });
    expect(result.loadTorqueNm).toBeCloseTo(12.5, 9);
  });

  it("rejects an efficiency outside (0, 1]", () => {
    expect(() =>
      resolveGearboxDeratedLoadTorque({
        driveTorqueNm: 10,
        gearboxEfficiency: 0,
      }),
    ).toThrow(DriveTrainInputError);
    expect(() =>
      resolveGearboxDeratedLoadTorque({
        driveTorqueNm: 10,
        gearboxEfficiency: 1.1,
      }),
    ).toThrow(DriveTrainInputError);
  });

  it("rejects a negative drive torque", () => {
    expect(() =>
      resolveGearboxDeratedLoadTorque({
        driveTorqueNm: -1,
        gearboxEfficiency: 1,
      }),
    ).toThrow(DriveTrainInputError);
  });
});

describe("resolveMomentaryTorque", () => {
  it("computes T1 = T_A + T_L (Omron's own example: 0.173 N*m)", () => {
    const result = resolveMomentaryTorque({
      accelerationTorqueNm: 0.165237,
      loadTorqueNm: 7.8e-3,
    });
    expect(result.momentaryTorqueNm).toBeCloseTo(0.173, 3);
  });

  it("rejects negative input", () => {
    expect(() =>
      resolveMomentaryTorque({ accelerationTorqueNm: -1, loadTorqueNm: 0 }),
    ).toThrow(DriveTrainInputError);
  });
});

describe("resolveEffectiveTorque", () => {
  it("computes Trms from the closed-cycle form (Omron's own example: 0.0828 N*m)", () => {
    const result = resolveEffectiveTorque({
      totalSystemInertiaKgM2: 1.753e-4,
      rmsAccelerationMps2: 0.75,
      leadM: 0.01,
      gearRatio: 1,
      loadTorqueNm: 7.8e-3,
    });
    // Within 0.0003 N*m of Omron's own printed 0.0828 N*m -- see
    // ./omron-reference-example.ts for why this residual is expected.
    expect(result.effectiveTorqueNm).toBeCloseTo(0.0828, 3);
  });

  it("reduces to the pure inertial term when load torque is zero", () => {
    const result = resolveEffectiveTorque({
      totalSystemInertiaKgM2: 1e-4,
      rmsAccelerationMps2: 2,
      leadM: 0.01,
      gearRatio: 1,
      loadTorqueNm: 0,
    });
    const torquePerLinearAccel = (1e-4 * 2 * Math.PI) / 0.01;
    expect(result.effectiveTorqueNm).toBeCloseTo(torquePerLinearAccel * 2, 9);
  });

  it("reduces to the pure load-torque term when RMS acceleration is zero", () => {
    const result = resolveEffectiveTorque({
      totalSystemInertiaKgM2: 1e-4,
      rmsAccelerationMps2: 0,
      leadM: 0.01,
      gearRatio: 1,
      loadTorqueNm: 5,
    });
    expect(result.effectiveTorqueNm).toBeCloseTo(5, 9);
  });

  it("rejects a non-positive total system inertia, lead, or gear ratio", () => {
    expect(() =>
      resolveEffectiveTorque({
        totalSystemInertiaKgM2: 0,
        rmsAccelerationMps2: 1,
        leadM: 0.01,
        gearRatio: 1,
        loadTorqueNm: 0,
      }),
    ).toThrow(DriveTrainInputError);
  });
});

describe("resolveRegenEnergy", () => {
  it("computes E = J_total*omega^2/2", () => {
    // omega = (1/0.01)*2*pi*1 = 200*pi rad/s
    const result = resolveRegenEnergy({
      totalSystemInertiaKgM2: 1e-4,
      linearVelocityMps: 1,
      leadM: 0.01,
      gearRatio: 1,
    });
    const omega = 200 * Math.PI;
    expect(result.regenEnergyJ).toBeCloseTo((1e-4 * omega ** 2) / 2, 6);
  });

  it("is zero at zero velocity", () => {
    const result = resolveRegenEnergy({
      totalSystemInertiaKgM2: 1e-4,
      linearVelocityMps: 0,
      leadM: 0.01,
      gearRatio: 1,
    });
    expect(result.regenEnergyJ).toBe(0);
  });

  it("rejects a non-positive total system inertia, lead, or gear ratio", () => {
    expect(() =>
      resolveRegenEnergy({
        totalSystemInertiaKgM2: 0,
        linearVelocityMps: 1,
        leadM: 0.01,
        gearRatio: 1,
      }),
    ).toThrow(DriveTrainInputError);
  });
});
