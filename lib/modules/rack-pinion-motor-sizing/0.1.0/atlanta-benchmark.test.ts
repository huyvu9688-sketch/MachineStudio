// Independent benchmark AND reference-example evidence for
// rack-pinion-motor-sizing@0.1.0 (stage-1-spec.md "Reference Examples and
// Independent Benchmark," validation.ts): Atlanta Drive Systems' own two
// published worked numerical examples ("Rack and Pinion Drive
// Calculations and Selection," pp. C-53-C-55), reproduced through this
// module's own real executeModule compute path.
//
// Reuses axis-load-cases@0.1.0's own already-tested
// resolveAtlantaHorizontalForce/resolveAtlantaVerticalForce directly (a
// cross-module test-only import, the same pattern
// ball-screw-motor-sizing@0.1.0's own independent-benchmark.test.ts
// already establishes importing drive-train's own THK fixtures) rather
// than re-deriving a duplicate force figure by hand. Atlanta's own
// document stays internal-only per the precedent axis-load-cases@0.1.0
// already set for this exact source (access: "licensed", redistribution
// status unresolved) -- never imported by manifest.ts, compute.ts, or
// trace.ts, and never cited in a customer-facing report.
//
// Conversion: Atlanta's own tangential force Fu is converted to a pinion
// torque via Fu*D/2 -- a transform Atlanta's own document does not
// print, independently justified by Andantex USA, Inc.'s own separately
// published Tp=Fr*d/2 relationship (stage-1-spec.md "Candidate Methods"
// item 3), not invented for this benchmark. The scenario uses a
// negligible (but nonzero, as this module's own kernel requires)
// pinion_mass, gear_ratio=1, mechanical_efficiency=1, and
// external_force=0 -- Atlanta's own Fu has no efficiency derating,
// gearbox reduction, or additional external force term, so this is the
// direct equivalent scenario, not a fudge.

import { describe, expect, it } from "vitest";
import { executeModule, makeQuantity } from "@/lib/engine";
import {
  resolveAtlantaHorizontalForce,
  resolveAtlantaVerticalForce,
} from "../../axis-load-cases/0.1.0/atlanta-benchmark";
import { rackPinionMotorSizingModule } from "./index";
import { asQuantity, type RawInput } from "./test-helpers";

// Atlanta's own printed examples use g=9.81 m/s^2 (not this project's own
// registry default of 9.80665) -- overridden explicitly here so the
// comparison is exact, not diluted by a standard-gravity convention
// difference neither worked example itself makes.
const ATLANTA_GRAVITY_MPS2 = 9.81;
// Arbitrary pinion pitch diameter: Atlanta's own Fu is independent of
// pinion size (a pure tangential force), and this module's own
// momentary_torque = Fu*D/2 relationship holds for any D once
// gear_ratio=1, mechanical_efficiency=1, and pinion_mass is negligible --
// verified by hand this session for D=0.1 m specifically, and provably
// D-independent algebraically (see stage-1-spec.md "Candidate Methods"
// item 3).
const PINION_PITCH_DIAMETER_M = 0.1;
const NEGLIGIBLE_PINION_MASS_KG = 0.001;

function baseInput(): RawInput {
  return {
    values: {
      gravity: makeQuantity(ATLANTA_GRAVITY_MPS2, "m/s^2"),
      pinion_pitch_diameter: makeQuantity(PINION_PITCH_DIAMETER_M, "m"),
      pinion_mass: makeQuantity(NEGLIGIBLE_PINION_MASS_KG, "kg"),
      gear_ratio: makeQuantity(1, "ratio"),
      mechanical_efficiency: makeQuantity(1, "ratio"),
      external_force: makeQuantity(0, "N"),
      motor_rotor_inertia: makeQuantity(1e-4, "kg*m^2"),
      required_torque_safety_factor: makeQuantity(1, "ratio"),
      inertia_ratio_maximum: makeQuantity(1e6, "ratio"),
    },
  };
}

describe("rack-pinion-motor-sizing 0.1.0 vs. Atlanta Drive Systems' own 'travelling operation' worked example (p. C-54), through executeModule", () => {
  const movingMassKg = 820;
  const velocityMps = 2;
  const accelerationTimeS = 1;
  const frictionCoefficient = 0.1;

  const expectedFuN = resolveAtlantaHorizontalForce({
    movingMassKg,
    velocityMps,
    accelerationTimeS,
    gravityMps2: ATLANTA_GRAVITY_MPS2,
    frictionCoefficient,
  });

  it("reproduces Atlanta's own published 2.44 kN tangential force via resolveAtlantaHorizontalForce (sanity: this fixture matches the already-tested axis-load-cases@0.1.0 benchmark)", () => {
    expect(expectedFuN).toBeCloseTo(2444.42, 2);
  });

  it("momentary_torque (load_torque+acceleration_torque) matches Fu*D/2 within 0.01%", () => {
    const input = baseInput();
    input.values.orientation = {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "horizontal",
    };
    input.values.incline_angle = makeQuantity(0, "rad");
    input.values.friction_coefficient = makeQuantity(
      frictionCoefficient,
      "ratio",
    );
    input.values.total_moving_mass = makeQuantity(movingMassKg, "kg");
    input.values.target_velocity = makeQuantity(velocityMps, "m/s");
    input.values.acceleration_time = makeQuantity(accelerationTimeS, "s");

    const result = executeModule(rackPinionMotorSizingModule, input);
    const momentaryTorqueNm = asQuantity(result.outputs.momentary_torque).value;

    const expectedTorqueNm = (expectedFuN * PINION_PITCH_DIAMETER_M) / 2;
    const relativeDifference =
      Math.abs(momentaryTorqueNm - expectedTorqueNm) / expectedTorqueNm;
    expect(relativeDifference).toBeLessThan(1e-4);
  });
});

describe("rack-pinion-motor-sizing 0.1.0 vs. Atlanta Drive Systems' own 'lifting operation' worked example (p. C-55), through executeModule", () => {
  const movingMassKg = 300;
  const velocityMps = 1.08;
  const accelerationTimeS = 0.27;

  const expectedFuN = resolveAtlantaVerticalForce({
    movingMassKg,
    velocityMps,
    accelerationTimeS,
    gravityMps2: ATLANTA_GRAVITY_MPS2,
  });

  it("reproduces Atlanta's own published 4.1 kN tangential force via resolveAtlantaVerticalForce (sanity)", () => {
    expect(expectedFuN).toBeCloseTo(4143, 0);
  });

  it("momentary_torque matches Fu*D/2 within 0.01% -- friction_coefficient is immaterial in a pure vertical lift (cos(90deg)=0), matching Atlanta's own lifting formula having no friction term at all", () => {
    const input = baseInput();
    input.values.orientation = {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "vertical",
    };
    input.values.incline_angle = makeQuantity(Math.PI / 2, "rad");
    input.values.friction_coefficient = makeQuantity(0.1, "ratio");
    input.values.total_moving_mass = makeQuantity(movingMassKg, "kg");
    input.values.target_velocity = makeQuantity(velocityMps, "m/s");
    input.values.acceleration_time = makeQuantity(accelerationTimeS, "s");

    const result = executeModule(rackPinionMotorSizingModule, input);
    const momentaryTorqueNm = asQuantity(result.outputs.momentary_torque).value;

    const expectedTorqueNm = (expectedFuN * PINION_PITCH_DIAMETER_M) / 2;
    const relativeDifference =
      Math.abs(momentaryTorqueNm - expectedTorqueNm) / expectedTorqueNm;
    expect(relativeDifference).toBeLessThan(1e-4);
  });
});
