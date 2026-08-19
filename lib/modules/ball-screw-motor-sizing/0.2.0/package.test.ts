import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { ballScrewMotorSizingModule } from "./index";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid horizontal, forward-move-only scenario exercising every
 * required port. Round engineering numbers, not a published worked example
 * — see the Omron reproduction test below for that.
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
      total_moving_mass: makeQuantity(5, "kg"),
      lead: makeQuantity(0.01, "m"),
      preload: makeQuantity(0, "N"),
      internal_friction_coefficient: makeQuantity(0, "ratio"),
      mechanical_efficiency: makeQuantity(1, "ratio"),
      screw_diameter: makeQuantity(0.02, "m"),
      screw_mass: makeQuantity(3, "kg"),
      forward_move_distance: makeQuantity(0.36, "m"),
      forward_max_velocity: makeQuantity(0.3, "m/s"),
      forward_max_acceleration: makeQuantity(1.5, "m/s^2"),
      motor_rotor_inertia: makeQuantity(1.23e-5, "kg*m^2"),
      effective_torque_safety_factor: makeQuantity(1.25, "ratio"),
      momentary_torque_safety_factor: makeQuantity(1.25, "ratio"),
      inertia_ratio_maximum: makeQuantity(30, "ratio"),
    },
  };
}

/** The same scenario, plus a return move (round trip) and a dwell. */
function roundTripInput(): RawInput {
  const input = baselineInput();
  input.values.return_move_distance = makeQuantity(0.36, "m");
  input.values.return_max_velocity = makeQuantity(0.3, "m/s");
  input.values.return_max_acceleration = makeQuantity(1.5, "m/s^2");
  input.values.dwell_time = makeQuantity(0.2, "s");
  return input;
}

/** A vertical scenario, to exercise the direction-dependent load torque. */
function verticalInput(): RawInput {
  const input = baselineInput();
  input.values.orientation = {
    v: 1,
    kind: "enum",
    enumId: "axis_orientation",
    value: "vertical",
  };
  input.values.incline_angle = makeQuantity(Math.PI / 2, "rad");
  input.values.return_move_distance = makeQuantity(0.36, "m");
  input.values.return_max_velocity = makeQuantity(0.3, "m/s");
  input.values.return_max_acceleration = makeQuantity(1.5, "m/s^2");
  return input;
}

// Pinned by `npm run module:source-hash -- ball-screw-motor-sizing 0.1.0`
// -- see lib/engine/module-sdk/conformance.ts's "source-immutability"
// check. Update this value in the same commit as a deliberate change to
// this directory's .ts files; an unreviewed change leaves it stale and the
// check below fails.
const EXPECTED_SOURCE_HASH = "18c8f078d2b91c8a";

describe("ball-screw-motor-sizing 0.1.0 module conformance", () => {
  const report = runModuleConformance(ballScrewMotorSizingModule, {
    sampleInputs: [baselineInput(), roundTripInput(), verticalInput()],
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

describe("ball-screw-motor-sizing 0.1.0 executeModule", () => {
  it("computes a horizontal, forward-only baseline without error", () => {
    const result = executeModule(ballScrewMotorSizingModule, baselineInput());
    expect(asQuantity(result.outputs.momentary_torque).value).toBeGreaterThan(
      0,
    );
    expect(asQuantity(result.outputs.effective_torque).value).toBeGreaterThan(
      0,
    );
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });

  it("reports return_load_torque equal to forward_load_torque on a horizontal axis with no return move", () => {
    const result = executeModule(ballScrewMotorSizingModule, baselineInput());
    const forward = asQuantity(result.outputs.forward_load_torque).value;
    const returnValue = asQuantity(result.outputs.return_load_torque).value;
    expect(returnValue).toBeCloseTo(forward, 12);
    expect(asQuantity(result.outputs.return_acceleration_torque).value).toBe(0);
  });

  it("reports a lower return_load_torque than forward_load_torque on a vertical round trip", () => {
    const result = executeModule(ballScrewMotorSizingModule, verticalInput());
    const forward = asQuantity(result.outputs.forward_load_torque).value;
    const returnValue = asQuantity(result.outputs.return_load_torque).value;
    expect(returnValue).toBeLessThan(forward);
  });

  it("a round trip's own effective torque differs from the forward-only cycle's", () => {
    const forwardOnly = executeModule(
      ballScrewMotorSizingModule,
      baselineInput(),
    );
    const roundTrip = executeModule(
      ballScrewMotorSizingModule,
      roundTripInput(),
    );
    const forwardOnlyRms = asQuantity(
      forwardOnly.outputs.effective_torque,
    ).value;
    const roundTripRms = asQuantity(roundTrip.outputs.effective_torque).value;
    expect(roundTripRms).not.toBeCloseTo(forwardOnlyRms, 6);
  });

  it("rejects a partial return-move declaration (input-schema co-requirement)", () => {
    const input = baselineInput();
    input.values.return_move_distance = makeQuantity(0.36, "m");
    // return_max_velocity/return_max_acceleration deliberately omitted.
    expect(() => executeModule(ballScrewMotorSizingModule, input)).toThrow();
  });

  it("fails the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(ballScrewMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("fail");
  });

  it("required_motor_rated_torque scales linearly with effective_torque_safety_factor", () => {
    const input = baselineInput();
    const base = executeModule(ballScrewMotorSizingModule, input);
    const doubled = { ...input, values: { ...input.values } };
    doubled.values.effective_torque_safety_factor = makeQuantity(2.5, "ratio");
    const result = executeModule(ballScrewMotorSizingModule, doubled);

    const baseRequired = asQuantity(
      base.outputs.required_motor_rated_torque,
    ).value;
    const doubledRequired = asQuantity(
      result.outputs.required_motor_rated_torque,
    ).value;
    expect(doubledRequired / baseRequired).toBeCloseTo(2.5 / 1.25, 9);
  });
});

// --- Reproduces Omron Corporation's own worked example through the real
// compute path (executeModule), not just math.ts's kernel level --------------

describe("ball-screw-motor-sizing 0.1.0: Omron Corporation's own worked example, through executeModule", () => {
  it("reproduces every printed figure within the source's own rounding", () => {
    const input: RawInput = {
      values: {
        orientation: {
          v: 1,
          kind: "enum",
          enumId: "axis_orientation",
          value: "horizontal",
        },
        incline_angle: makeQuantity(0, "rad"),
        friction_coefficient: makeQuantity(0.1, "ratio"),
        total_moving_mass: makeQuantity(5, "kg"),
        lead: makeQuantity(0.01, "m"),
        preload: makeQuantity(0, "N"),
        internal_friction_coefficient: makeQuantity(0, "ratio"),
        mechanical_efficiency: makeQuantity(1, "ratio"),
        screw_diameter: makeQuantity(0.02, "m"),
        screw_mass: makeQuantity(3, "kg"),
        forward_move_distance: makeQuantity(0.36, "m"),
        forward_max_velocity: makeQuantity(0.3, "m/s"),
        forward_max_acceleration: makeQuantity(1.5, "m/s^2"),
        dwell_time: makeQuantity(0.2, "s"),
        motor_rotor_inertia: makeQuantity(1.23e-5, "kg*m^2"),
        effective_torque_safety_factor: makeQuantity(1, "ratio"),
        momentary_torque_safety_factor: makeQuantity(1, "ratio"),
        inertia_ratio_maximum: makeQuantity(30, "ratio"),
      },
    };

    const result = executeModule(ballScrewMotorSizingModule, input);

    expect(asQuantity(result.outputs.screw_inertia).value).toBeCloseTo(
      1.5e-4,
      9,
    );
    expect(asQuantity(result.outputs.load_inertia).value).toBeCloseTo(
      1.63e-4,
      6,
    );
    expect(asQuantity(result.outputs.total_system_inertia).value).toBeCloseTo(
      1.23e-5 + 1.63e-4,
      6,
    );
    expect(asQuantity(result.outputs.forward_load_torque).value).toBeCloseTo(
      7.8e-3,
      4,
    );
    expect(
      asQuantity(result.outputs.forward_acceleration_torque).value,
    ).toBeCloseTo(0.165, 3);
    expect(asQuantity(result.outputs.momentary_torque).value).toBeCloseTo(
      0.173,
      3,
    );
    expect(asQuantity(result.outputs.effective_torque).value).toBeCloseTo(
      0.0828,
      3,
    );

    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass"); // Omron's own "Result of Examination": condition satisfied.
  });
});
