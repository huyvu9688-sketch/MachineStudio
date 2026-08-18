// Imports from the Stage-3-draft `./package`, not `./index` -- every other
// module's own package.test.ts imports `./index`, but this module's
// package.ts hasn't been renamed to index.ts yet. Task 13 does that rename
// (alongside recomputing EXPECTED_SOURCE_HASH below), the same convention
// documented in this module's own package.ts header comment.

import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { beltPulleyDriveMotorSizingModule } from "./package";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid velocity-mode scenario exercising every required port.
 * Round engineering numbers, not a published worked example -- see
 * automationdirect-reference-example.test.ts for that.
 */
function baselineInput(): RawInput {
  return {
    values: {
      orientation: {
        v: 1,
        kind: "enum",
        enumId: "axis_orientation",
        value: "horizontal",
      },
      incline_angle: makeQuantity(0, "rad"),
      friction_coefficient: makeQuantity(0.1, "ratio"),
      total_moving_mass: makeQuantity(50, "kg"),
      pulley_pitch_diameter: makeQuantity(0.08, "m"),
      pulley_mass: makeQuantity(1, "kg"),
      idler_pulley_mass: makeQuantity(1, "kg"),
      belt_mass: makeQuantity(0.5, "kg"),
      gear_ratio: makeQuantity(1, "ratio"),
      mechanical_efficiency: makeQuantity(0.9, "ratio"),
      external_force: makeQuantity(0, "N"),
      motion_mode: {
        v: 1,
        kind: "enum",
        enumId: "belt_pulley_motion_mode",
        value: "velocity",
      },
      target_velocity: makeQuantity(0.5, "m/s"),
      acceleration_time: makeQuantity(0.5, "s"),
      deceleration_time: makeQuantity(0.5, "s"),
      constant_velocity_time: makeQuantity(1, "s"),
      dwell_time: makeQuantity(0, "s"),
      motor_rotor_inertia: makeQuantity(5e-3, "kg*m^2"),
      required_torque_safety_factor: makeQuantity(2, "ratio"),
      inertia_ratio_maximum: makeQuantity(30, "ratio"),
    },
  };
}

/** Same scenario, motion_mode="distance" with an equivalent travel_distance/cycle_time. */
function distanceModeInput(): RawInput {
  const input = baselineInput();
  delete (input.values as Record<string, unknown>).target_velocity;
  delete (input.values as Record<string, unknown>).constant_velocity_time;
  input.values.motion_mode = {
    v: 1,
    kind: "enum",
    enumId: "belt_pulley_motion_mode",
    value: "distance",
  };
  // Equivalent to baselineInput(): V=0.5 m/s, t1=t3=0.5s, t2=1s ->
  // S = 0.5*(0.5+0.5)/2 + 0.5*1 = 0.75 m; tf = 0.5+1+0.5+0 = 2 s.
  input.values.travel_distance = makeQuantity(0.75, "m");
  input.values.cycle_time = makeQuantity(2, "s");
  return input;
}

/** Same scenario, vertical orientation. */
function verticalInput(): RawInput {
  const input = baselineInput();
  input.values.orientation = {
    v: 1,
    kind: "enum",
    enumId: "axis_orientation",
    value: "vertical",
  };
  input.values.incline_angle = makeQuantity(Math.PI / 2, "rad");
  return input;
}

// Pinned by `npm run module:source-hash -- belt-pulley-drive-motor-sizing
// 0.2.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Recomputed in Task 13 after package.ts is
// renamed to index.ts (the hash covers this directory's own filenames).
const EXPECTED_SOURCE_HASH = "fe8105b28ee143c4";

describe("belt-pulley-drive-motor-sizing 0.2.0 module conformance", () => {
  const report = runModuleConformance(beltPulleyDriveMotorSizingModule, {
    sampleInputs: [baselineInput(), distanceModeInput(), verticalInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  it("passes package-validation", () => {
    const check = report.checks.find((c) => c.id === "package-validation");
    expect(check?.status).toBe("pass");
  });

  it("passes import-boundary as a real check", () => {
    const check = report.checks.find((c) => c.id === "import-boundary");
    expect(check?.status).toBe("pass");
  });

  it("runs the source-immutability check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "source-immutability");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });

  it("every sample input executes: inputs/outputs validate, trace is complete", () => {
    const check = report.checks.find((c) => c.id === "execution");
    expect(check?.status).toBe("pass");
  });

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});

describe("belt-pulley-drive-motor-sizing 0.2.0 executeModule", () => {
  it("computes a baseline velocity-mode scenario without error", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    expect(asQuantity(result.outputs.load_torque).value).toBeGreaterThan(0);
    expect(
      asQuantity(result.outputs.acceleration_torque).value,
    ).toBeGreaterThan(0);
    expect(
      asQuantity(result.outputs.deceleration_torque).value,
    ).toBeGreaterThan(0);
    expect(asQuantity(result.outputs.effective_torque).value).toBeGreaterThan(
      0,
    );
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });

  it("velocity mode derives travel_distance and cycle_time matching the closed form", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    // V=0.5, t1=t3=0.5, t2=1, t4=0 -> S=0.5*(1)/2+0.5*1=0.75; tf=2.
    expect(asQuantity(result.outputs.travel_distance).value).toBeCloseTo(
      0.75,
      12,
    );
    expect(asQuantity(result.outputs.cycle_time).value).toBeCloseTo(2, 12);
  });

  it("distance mode derives target_velocity and constant_velocity_time matching the equivalent velocity-mode scenario", () => {
    const velocityResult = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const distanceResult = executeModule(
      beltPulleyDriveMotorSizingModule,
      distanceModeInput(),
    );
    expect(
      asQuantity(distanceResult.outputs.target_velocity).value,
    ).toBeCloseTo(asQuantity(velocityResult.outputs.target_velocity).value, 9);
    expect(
      asQuantity(distanceResult.outputs.constant_velocity_time).value,
    ).toBeCloseTo(
      asQuantity(velocityResult.outputs.constant_velocity_time).value,
      9,
    );
    // Every downstream torque/power output agrees too -- the two modes are
    // just two ways of specifying the identical physical motion.
    expect(
      asQuantity(distanceResult.outputs.effective_torque).value,
    ).toBeCloseTo(asQuantity(velocityResult.outputs.effective_torque).value, 9);
  });

  it("deceleration_torque equals acceleration_torque when acceleration_time equals deceleration_time (symmetric ramp)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    expect(asQuantity(result.outputs.deceleration_torque).value).toBeCloseTo(
      asQuantity(result.outputs.acceleration_torque).value,
      12,
    );
  });

  it("throws a feasibility error when distance mode's cycle_time is too short for the accel/decel times", () => {
    const input = distanceModeInput();
    input.values.cycle_time = makeQuantity(0.5, "s"); // shorter than t1+t3=1.0s
    expect(() =>
      executeModule(beltPulleyDriveMotorSizingModule, input),
    ).toThrow();
  });

  it("rejects velocity mode missing constant_velocity_time (input-schema coverage)", () => {
    const input = baselineInput();
    delete (input.values as Record<string, unknown>).constant_velocity_time;
    expect(() =>
      executeModule(beltPulleyDriveMotorSizingModule, input),
    ).toThrow();
  });

  it("a vertical scenario has a larger load_torque than the equivalent horizontal one", () => {
    const horizontal = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const vertical = executeModule(
      beltPulleyDriveMotorSizingModule,
      verticalInput(),
    );
    expect(asQuantity(vertical.outputs.load_torque).value).toBeGreaterThan(
      asQuantity(horizontal.outputs.load_torque).value,
    );
  });

  it("effective_torque is bounded between load_torque and momentary_torque for a symmetric cycle with a nonzero run phase", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const trms = asQuantity(result.outputs.effective_torque).value;
    const momentary = asQuantity(result.outputs.momentary_torque).value;
    const loadTorque = asQuantity(result.outputs.load_torque).value;
    expect(trms).toBeGreaterThanOrEqual(loadTorque);
    expect(trms).toBeLessThanOrEqual(momentary);
  });

  it("serializes and deserializes outputs without semantic loss (round trip)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const roundTripped = JSON.parse(JSON.stringify(result.outputs));
    expect(roundTripped.effective_torque.value).toBeCloseTo(
      asQuantity(result.outputs.effective_torque).value,
      12,
    );
    expect(roundTripped.effective_torque.unit).toBe(
      asQuantity(result.outputs.effective_torque).unit,
    );
  });
});
