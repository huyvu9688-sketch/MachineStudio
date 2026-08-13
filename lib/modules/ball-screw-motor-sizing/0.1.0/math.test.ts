import { describe, expect, it } from "vitest";
import { BallScrewMotorSizingInputError } from "./math";
import {
  accelerationTorque,
  resolveAngularAcceleration,
  resolveDriveForce,
  resolveEffectiveTorque,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveMotorShaftSpeed,
  resolvePhaseTorque,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveScrewInertia,
  resolveTotalSystemInertia,
  resolveTrapezoidalMove,
  type CyclePhase,
} from "./math";

// --- 1. Inertia ------------------------------------------------------------

describe("resolveScrewInertia", () => {
  it("returns (1/8)*M_B*D^2, matching lib/engine/mechanics directly", () => {
    expect(
      resolveScrewInertia({ screwDiameterM: 0.02, screwMassKg: 3 })
        .screwInertiaKgM2,
    ).toBeCloseTo((3 * 0.02 ** 2) / 8, 15);
  });

  it("rejects a non-positive diameter", () => {
    expect(() =>
      resolveScrewInertia({ screwDiameterM: 0, screwMassKg: 3 }),
    ).toThrow(BallScrewMotorSizingInputError);
  });
});

describe("resolveLoadInertia", () => {
  it("reproduces Omron's own JW = JB + M*(P/2pi)^2 worked example", () => {
    // Servo Selection.pdf p. 12: JB=1.5e-4, M=5 kg, P=10 mm -> JW=1.63e-4.
    const { screwInertiaKgM2 } = resolveScrewInertia({
      screwDiameterM: 0.02,
      screwMassKg: 3,
    });
    expect(screwInertiaKgM2).toBeCloseTo(1.5e-4, 9);

    const { loadInertiaKgM2 } = resolveLoadInertia({
      screwInertiaKgM2,
      totalMovingMassKg: 5,
      leadM: 0.01,
    });
    expect(loadInertiaKgM2).toBeCloseTo(1.63e-4, 6);
  });

  it("rejects a non-positive mass", () => {
    expect(() =>
      resolveLoadInertia({
        screwInertiaKgM2: 1.5e-4,
        totalMovingMassKg: 0,
        leadM: 0.01,
      }),
    ).toThrow(BallScrewMotorSizingInputError);
  });
});

describe("resolveReflectedLoadInertia", () => {
  it("divides by the gear ratio squared", () => {
    const base = resolveReflectedLoadInertia({
      loadInertiaKgM2: 1.63e-4,
      gearRatio: 1,
    }).reflectedLoadInertiaKgM2;
    expect(base).toBeCloseTo(1.63e-4, 12);

    const geared = resolveReflectedLoadInertia({
      loadInertiaKgM2: 1.63e-4,
      gearRatio: 2,
    }).reflectedLoadInertiaKgM2;
    expect(geared).toBeCloseTo(1.63e-4 / 4, 12);
  });
});

describe("resolveTotalSystemInertia / resolveInertiaRatio", () => {
  it("reproduces Omron's own J_total and inertia-ratio inputs", () => {
    const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1.23e-5,
      reflectedLoadInertiaKgM2: 1.63e-4,
    });
    expect(totalSystemInertiaKgM2).toBeCloseTo(1.23e-5 + 1.63e-4, 12);

    const { inertiaRatio } = resolveInertiaRatio({
      reflectedLoadInertiaKgM2: 1.63e-4,
      motorRotorInertiaKgM2: 1.23e-5,
    });
    expect(inertiaRatio).toBeCloseTo(1.63e-4 / 1.23e-5, 9);
    expect(inertiaRatio).toBeLessThan(30); // Omron's own "Result of Examination": condition satisfied.
  });
});

// --- 2. Drive force and load torque -----------------------------------------

describe("resolveDriveForce", () => {
  it("is direction-independent on a horizontal axis", () => {
    const forward = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    }).forceN;
    const returnForce = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "return",
    }).forceN;
    expect(forward).toBeCloseTo(returnForce, 12);
    expect(forward).toBeCloseTo(0.1 * 5 * 9.8, 12);
  });

  it("reproduces Omron's own horizontal friction-torque force (TW input)", () => {
    // Servo Selection.pdf p. 12: TW = mu*M*g*(P/2pi)*10^-3 = 7.8e-3 N*m at
    // P=10mm -- the force term alone (before the lead/2pi conversion) is
    // mu*M*g = 0.1*5*9.8 = 4.9 N.
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
    expect(forceN).toBeCloseTo(4.9, 9);
  });

  it("adds gravity for the forward (upward) direction on a vertical axis", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.8,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.05,
      direction: "forward",
    });
    // sin(pi/2)=1, cos(pi/2)=0 -- friction term vanishes on a vertical axis.
    expect(forceN).toBeCloseTo(10 * 9.8, 9);
  });

  it("subtracts gravity for the return (downward) direction on a vertical axis", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.8,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.05,
      direction: "return",
    });
    expect(forceN).toBeCloseTo(-10 * 9.8, 9);
  });

  it("can go negative for a strongly gravity-assisted return direction (the motor must brake)", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 50,
      gravityMps2: 9.8,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.02,
      direction: "return",
    });
    expect(forceN).toBeLessThan(0);
  });

  it("rejects an incline angle outside [0, pi/2]", () => {
    expect(() =>
      resolveDriveForce({
        externalForceN: 0,
        totalMovingMassKg: 5,
        gravityMps2: 9.8,
        inclineAngleRad: Math.PI,
        frictionCoefficient: 0.1,
        direction: "forward",
      }),
    ).toThrow(BallScrewMotorSizingInputError);
  });
});

describe("resolveLoadTorque", () => {
  it("reproduces Omron's own TW = 7.8e-3 N*m worked example", () => {
    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      leadM: 0.01,
      efficiency: 1,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    expect(loadTorqueNm).toBeCloseTo(7.8e-3, 4);
  });

  it("reproduces the ball-screw module's own Rockford-sourced form", () => {
    // Same formula, same reference-example shape as
    // lib/modules/ball-screw/0.1.0/math.ts's own resolveDriveTorque test:
    // Pt=500 lbf, Sl=.25in, Eff=90% -> ~22.1 in-lbf. Reproduced in SI here
    // as a structural cross-check, not a unit conversion exercise.
    const forceN = 500 * 4.4482216152605;
    const leadM = 0.25 * 0.0254;
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      leadM,
      efficiency: 0.9,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    const expectedNm = (22.1 * 4.4482216152605 * 0.0254) / 1; // in-lbf -> N*m
    expect(loadTorqueNm).toBeCloseTo(expectedNm, 2);
  });

  it("rejects efficiency outside (0, 1]", () => {
    expect(() =>
      resolveLoadTorque({
        forceN: 10,
        leadM: 0.01,
        efficiency: 1.1,
        preloadN: 0,
        internalFrictionCoefficient: 0,
        gearRatio: 1,
      }),
    ).toThrow(BallScrewMotorSizingInputError);
  });
});

// --- 3. Angular acceleration and motor-shaft speed --------------------------

describe("resolveAngularAcceleration", () => {
  it("returns (a/lead)*2*pi*gearRatio", () => {
    const { angularAccelerationRadPerS2 } = resolveAngularAcceleration({
      linearAccelerationMps2: 1.5,
      leadM: 0.01,
      gearRatio: 1,
    });
    expect(angularAccelerationRadPerS2).toBeCloseTo(
      (1.5 / 0.01) * 2 * Math.PI,
      6,
    );
  });
});

describe("resolveMotorShaftSpeed", () => {
  it("reproduces Omron's own N=1800 rpm worked example", () => {
    const { rotationalSpeedRadPerS } = resolveMotorShaftSpeed({
      linearVelocityMps: 0.3,
      leadM: 0.01,
      gearRatio: 1,
    });
    const expectedRadPerS = (1800 * 2 * Math.PI) / 60;
    expect(rotationalSpeedRadPerS).toBeCloseTo(expectedRadPerS, 6);
  });
});

// --- 4. Trapezoidal move -----------------------------------------------------

describe("resolveTrapezoidalMove", () => {
  it("reproduces Omron's own accel(0.2s)+constant(1.0s)+decel(0.2s) cycle", () => {
    // V=300mm/s, L=360mm, tA=0.2s, tS=1.4s -> constant phase 1.0s.
    const move = resolveTrapezoidalMove({
      moveDistanceM: 0.36,
      maxVelocityMps: 0.3,
      maxAccelerationMps2: 0.3 / 0.2,
    });
    expect(move.profileType).toBe("trapezoidal");
    expect(move.accelerationTimeS).toBeCloseTo(0.2, 9);
    expect(move.decelerationTimeS).toBeCloseTo(0.2, 9);
    expect(move.constantVelocityTimeS).toBeCloseTo(1.0, 9);
    expect(move.moveTimeS).toBeCloseTo(1.4, 9);
  });

  it("falls back to a triangular profile when the move is too short", () => {
    const move = resolveTrapezoidalMove({
      moveDistanceM: 0.001,
      maxVelocityMps: 1,
      maxAccelerationMps2: 1,
    });
    expect(move.profileType).toBe("triangular");
    expect(move.constantVelocityTimeS).toBe(0);
    expect(move.peakVelocityMps).toBeLessThan(1);
  });
});

// --- 5. Per-phase torque, momentary torque, effective (RMS) torque ----------

describe("resolvePhaseTorque", () => {
  it("adds acceleration torque during accel, subtracts during decel", () => {
    expect(
      resolvePhaseTorque({
        loadTorqueNm: 0.0078,
        accelerationTorqueNm: 0.165,
        phase: "accel",
      }).torqueNm,
    ).toBeCloseTo(0.1728, 9);
    expect(
      resolvePhaseTorque({
        loadTorqueNm: 0.0078,
        accelerationTorqueNm: 0.165,
        phase: "decel",
      }).torqueNm,
    ).toBeCloseTo(-0.1572, 9);
    expect(
      resolvePhaseTorque({
        loadTorqueNm: 0.0078,
        accelerationTorqueNm: 0.165,
        phase: "constant",
      }).torqueNm,
    ).toBeCloseTo(0.0078, 9);
  });

  it("carries a negative load torque through unchanged (gravity-assisted return)", () => {
    expect(
      resolvePhaseTorque({
        loadTorqueNm: -0.05,
        accelerationTorqueNm: 0.02,
        phase: "accel",
      }).torqueNm,
    ).toBeCloseTo(-0.03, 9);
  });
});

describe("resolveMomentaryTorque", () => {
  it("returns the largest-magnitude phase torque, matching Omron's own T1", () => {
    // Omron: T1=0.173, T2=0.0078, T3=-0.157.
    const phases: CyclePhase[] = [
      { durationS: 0.2, torqueNm: 0.173 },
      { durationS: 1.0, torqueNm: 0.0078 },
      { durationS: 0.2, torqueNm: -0.157 },
      { durationS: 0.2, torqueNm: 0 },
    ];
    expect(resolveMomentaryTorque(phases).momentaryTorqueNm).toBeCloseTo(
      0.173,
      9,
    );
  });

  it("picks the larger magnitude even when it is the negative phase", () => {
    const phases: CyclePhase[] = [
      { durationS: 0.2, torqueNm: 0.1 },
      { durationS: 0.2, torqueNm: -0.3 },
    ];
    expect(resolveMomentaryTorque(phases).momentaryTorqueNm).toBeCloseTo(
      0.3,
      9,
    );
  });

  it("rejects an empty phase list", () => {
    expect(() => resolveMomentaryTorque([])).toThrow(
      BallScrewMotorSizingInputError,
    );
  });
});

describe("resolveEffectiveTorque", () => {
  it("reproduces Omron's own Trms = 0.0828 N*m worked example exactly", () => {
    // Servo Selection.pdf p. 13: T1=0.173 (t1=0.2), T2=0.0078 (t2=1.0),
    // T3=-0.157 (t3=0.2), dwell t4=0.2 (T4=0, implicit).
    const phases: CyclePhase[] = [
      { durationS: 0.2, torqueNm: 0.173 },
      { durationS: 1.0, torqueNm: 0.0078 },
      { durationS: 0.2, torqueNm: -0.157 },
      { durationS: 0.2, torqueNm: 0 },
    ];
    const { effectiveTorqueNm } = resolveEffectiveTorque(phases);
    expect(effectiveTorqueNm).toBeCloseTo(0.0828, 3);
  });

  it("is unaffected by adding a zero-torque dwell phase", () => {
    const withoutDwell = resolveEffectiveTorque([
      { durationS: 0.2, torqueNm: 0.173 },
      { durationS: 1.0, torqueNm: 0.0078 },
      { durationS: 0.2, torqueNm: -0.157 },
    ]).effectiveTorqueNm;
    const withZeroDurationDwell = resolveEffectiveTorque([
      { durationS: 0.2, torqueNm: 0.173 },
      { durationS: 1.0, torqueNm: 0.0078 },
      { durationS: 0.2, torqueNm: -0.157 },
      { durationS: 0, torqueNm: 0 },
    ]).effectiveTorqueNm;
    expect(withZeroDurationDwell).toBeCloseTo(withoutDwell, 12);
  });

  it("a nonzero dwell dilutes the RMS toward zero (more time at zero torque)", () => {
    const shortCycle = resolveEffectiveTorque([
      { durationS: 1, torqueNm: 1 },
    ]).effectiveTorqueNm;
    const withLongDwell = resolveEffectiveTorque([
      { durationS: 1, torqueNm: 1 },
      { durationS: 9, torqueNm: 0 },
    ]).effectiveTorqueNm;
    expect(withLongDwell).toBeLessThan(shortCycle);
    expect(withLongDwell).toBeCloseTo(Math.sqrt(1 / 10), 12);
  });

  it("agrees with a structurally different direct weighted-RMS computation", () => {
    // Independent-benchmark-style cross-check: a brute-force sum expressed
    // without the kernel's own accumulator pattern.
    const phases: CyclePhase[] = [
      { durationS: 0.3, torqueNm: 2.1 },
      { durationS: 0.5, torqueNm: -0.4 },
      { durationS: 1.2, torqueNm: 0.9 },
    ];
    const totalT = phases.reduce((sum, p) => sum + p.durationS, 0);
    const bruteForce = Math.sqrt(
      phases
        .map((p) => p.torqueNm ** 2 * p.durationS)
        .reduce((a, b) => a + b, 0) / totalT,
    );
    expect(resolveEffectiveTorque(phases).effectiveTorqueNm).toBeCloseTo(
      bruteForce,
      12,
    );
  });

  it("rejects zero total duration", () => {
    expect(() =>
      resolveEffectiveTorque([{ durationS: 0, torqueNm: 1 }]),
    ).toThrow(BallScrewMotorSizingInputError);
  });
});

// --- 6. Required torque -------------------------------------------------------

describe("resolveRequiredTorque", () => {
  it("multiplies the computed torque by the safety factor", () => {
    expect(
      resolveRequiredTorque({ computedTorqueNm: 0.173, safetyFactor: 1.25 })
        .requiredTorqueNm,
    ).toBeCloseTo(0.21625, 9);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolveRequiredTorque({ computedTorqueNm: 0.173, safetyFactor: 0.9 }),
    ).toThrow(BallScrewMotorSizingInputError);
  });
});

// --- 7. End-to-end reproduction of Omron's own full worked example ----------

describe("end-to-end: Omron Corporation's own worked example", () => {
  it("reproduces every printed intermediate and final figure through this module's own kernel", () => {
    // Servo Selection.pdf pp. 12-13, full scenario.
    const { screwInertiaKgM2 } = resolveScrewInertia({
      screwDiameterM: 0.02,
      screwMassKg: 3,
    });
    const { loadInertiaKgM2 } = resolveLoadInertia({
      screwInertiaKgM2,
      totalMovingMassKg: 5,
      leadM: 0.01,
    });
    const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
      loadInertiaKgM2,
      gearRatio: 1,
    });
    const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
      motorRotorInertiaKgM2: 1.23e-5,
      reflectedLoadInertiaKgM2,
    });
    expect(totalSystemInertiaKgM2).toBeCloseTo(1.23e-5 + 1.63e-4, 6);

    const { forceN } = resolveDriveForce({
      externalForceN: 0,
      totalMovingMassKg: 5,
      gravityMps2: 9.8,
      inclineAngleRad: 0,
      frictionCoefficient: 0.1,
      direction: "forward",
    });
    const { loadTorqueNm } = resolveLoadTorque({
      forceN,
      leadM: 0.01,
      efficiency: 1,
      preloadN: 0,
      internalFrictionCoefficient: 0,
      gearRatio: 1,
    });
    expect(loadTorqueNm).toBeCloseTo(0.0078, 4);

    const { angularAccelerationRadPerS2 } = resolveAngularAcceleration({
      linearAccelerationMps2: 1.5,
      leadM: 0.01,
      gearRatio: 1,
    });
    const { torqueNm: accelerationTorqueNm } = accelerationTorque({
      inertiaKgM2: totalSystemInertiaKgM2,
      angularAccelerationRadPerS2,
    });
    expect(accelerationTorqueNm).toBeCloseTo(0.165, 3);

    const accelPhase = resolvePhaseTorque({
      loadTorqueNm,
      accelerationTorqueNm,
      phase: "accel",
    });
    const constPhase = resolvePhaseTorque({
      loadTorqueNm,
      accelerationTorqueNm,
      phase: "constant",
    });
    const decelPhase = resolvePhaseTorque({
      loadTorqueNm,
      accelerationTorqueNm,
      phase: "decel",
    });
    expect(accelPhase.torqueNm).toBeCloseTo(0.173, 3);
    expect(constPhase.torqueNm).toBeCloseTo(0.0078, 4);
    expect(decelPhase.torqueNm).toBeCloseTo(-0.157, 3);

    const phases: CyclePhase[] = [
      { durationS: 0.2, torqueNm: accelPhase.torqueNm },
      { durationS: 1.0, torqueNm: constPhase.torqueNm },
      { durationS: 0.2, torqueNm: decelPhase.torqueNm },
      { durationS: 0.2, torqueNm: 0 },
    ];
    expect(resolveMomentaryTorque(phases).momentaryTorqueNm).toBeCloseTo(
      0.173,
      3,
    );
    expect(resolveEffectiveTorque(phases).effectiveTorqueNm).toBeCloseTo(
      0.0828,
      3,
    );
  });
});
