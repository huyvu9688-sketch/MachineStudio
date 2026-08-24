import { describe, expect, it } from "vitest";
import {
  resolveDriveForce,
  resolveEffectiveTorque,
  resolveLoadTorque,
} from "./math";
import {
  resolveOrientalMotorLoadTorque,
  resolvePhaseRmsTorque,
  type RmsTorquePhase,
} from "./independent-benchmark";

const G = 9.80665;

describe("independent benchmark: force/load-torque (carried over from 0.1.0)", () => {
  it("agrees with this module's own two-function kernel across a property sweep", () => {
    const masses = [10, 50, 200];
    const inclines = [0, Math.PI / 6, Math.PI / 2];
    const frictions = [0, 0.1, 0.3];
    const externalForces = [-20, 0, 50];
    const diameters = [0.05, 0.08, 0.2];
    const efficiencies = [0.7, 0.9, 1.0];
    const gearRatios = [1, 5, 10];

    for (const mass of masses) {
      for (const incline of inclines) {
        for (const friction of frictions) {
          for (const externalForce of externalForces) {
            for (const diameter of diameters) {
              for (const efficiency of efficiencies) {
                for (const gearRatio of gearRatios) {
                  const kernel = (() => {
                    const { forceN } = resolveDriveForce({
                      externalForceN: externalForce,
                      totalMovingMassKg: mass,
                      inclineAngleRad: incline,
                      frictionCoefficient: friction,
                    });
                    return resolveLoadTorque({
                      forceN,
                      pulleyPitchDiameterM: diameter,
                      mechanicalEfficiency: efficiency,
                      gearRatio,
                    }).loadTorqueNm;
                  })();
                  // resolveOrientalMotorLoadTorque (./independent-benchmark)
                  // is a deliberately separate reimplementation with its own
                  // gravityMps2 input -- unaffected by 0.3.0's gravity
                  // hardcode in ./math.ts, and kept at exactly G=9.80665
                  // here so this property sweep still compares like for
                  // like against the kernel's own (now-hardcoded) value.
                  const benchmark = resolveOrientalMotorLoadTorque({
                    totalMovingMassKg: mass,
                    gravityMps2: G,
                    inclineAngleRad: incline,
                    frictionCoefficient: friction,
                    externalForceN: externalForce,
                    pulleyPitchDiameterM: diameter,
                    mechanicalEfficiency: efficiency,
                    gearRatio,
                  }).loadTorqueNm;
                  expect(kernel).toBeCloseTo(benchmark, 9);
                }
              }
            }
          }
        }
      }
    }
  });
});

describe("independent benchmark: effective (RMS) torque (new in 0.2.0)", () => {
  function directPhaseTrms(
    Ta: number,
    TL: number,
    Td: number,
    t1: number,
    t2: number,
    t3: number,
    t4: number,
  ): number {
    const phases: RmsTorquePhase[] = [
      { torqueNm: Ta + TL, durationS: t1 },
      { torqueNm: TL, durationS: t2 },
      { torqueNm: Td - TL, durationS: t3 },
      // 0.3.1 fix: the dwell phase holds load_torque (TL), not zero -- see
      // resolveEffectiveTorque's own doc comment in ./math.ts. This
      // benchmark previously fixed dwell torque at zero, the same
      // assumption the real bug made, so it could never have caught it.
      { torqueNm: TL, durationS: t4 },
    ].filter((phase) => phase.durationS > 0);
    return resolvePhaseRmsTorque(phases);
  }

  it("agrees with resolveEffectiveTorque's own closed form across a property sweep, including t2=0 and t4=0 boundary cases", () => {
    const accelTorques = [1, 5, 20];
    const loadTorques = [0, 2, 10];
    const decelTorques = [1, 5, 20];
    const accelTimes = [0.2, 1, 3];
    const runTimes = [0, 1, 5];
    const decelTimes = [0.2, 1, 3];
    const dwellTimes = [0, 0.5, 2];

    for (const Ta of accelTorques) {
      for (const TL of loadTorques) {
        for (const Td of decelTorques) {
          for (const t1 of accelTimes) {
            for (const t2 of runTimes) {
              for (const t3 of decelTimes) {
                for (const t4 of dwellTimes) {
                  const tf = t1 + t2 + t3 + t4;
                  const closedForm = resolveEffectiveTorque({
                    accelerationTorqueNm: Ta,
                    loadTorqueNm: TL,
                    decelerationTorqueNm: Td,
                    accelerationTimeS: t1,
                    constantVelocityTimeS: t2,
                    decelerationTimeS: t3,
                    dwellTimeS: t4,
                    cycleTimeS: tf,
                  }).effectiveTorqueNm;
                  const direct = directPhaseTrms(Ta, TL, Td, t1, t2, t3, t4);
                  expect(closedForm).toBeCloseTo(direct, 9);
                }
              }
            }
          }
        }
      }
    }
  });
});
