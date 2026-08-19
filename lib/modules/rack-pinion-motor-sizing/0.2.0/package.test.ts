import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { rackPinionMotorSizingModule } from "./index";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port. Round
 * engineering numbers, not a published worked example -- see
 * atlanta-benchmark.test.ts for that.
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
      pinion_pitch_diameter: makeQuantity(0.08, "m"),
      pinion_mass: makeQuantity(1, "kg"),
      gear_ratio: makeQuantity(1, "ratio"),
      mechanical_efficiency: makeQuantity(0.9, "ratio"),
      external_force: makeQuantity(0, "N"),
      target_velocity: makeQuantity(0.5, "m/s"),
      acceleration_time: makeQuantity(0.5, "s"),
      motor_rotor_inertia: makeQuantity(5e-3, "kg*m^2"),
      required_torque_safety_factor: makeQuantity(2, "ratio"),
      inertia_ratio_maximum: makeQuantity(30, "ratio"),
    },
  };
}

/** Same scenario, vertical orientation (incline_angle = pi/2). */
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

/** Same scenario, geared 5:1 (motor spins faster than the pinion). */
function gearedInput(): RawInput {
  const input = baselineInput();
  input.values.gear_ratio = makeQuantity(5, "ratio");
  return input;
}

// Pinned by `npm run module:source-hash -- rack-pinion-motor-sizing
// 0.2.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Update this value in the same commit as a
// deliberate change to this directory's .ts files; an unreviewed change
// leaves it stale and the check below fails. Placeholder until the real
// hash is computed.
const EXPECTED_SOURCE_HASH = "PLACEHOLDER_UNTIL_HASH_COMPUTED";

describe("rack-pinion-motor-sizing 0.2.0 module conformance", () => {
  const report = runModuleConformance(rackPinionMotorSizingModule, {
    sampleInputs: [baselineInput(), verticalInput(), gearedInput()],
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

describe("rack-pinion-motor-sizing 0.2.0 executeModule", () => {
  it("computes a baseline horizontal scenario without error", () => {
    const result = executeModule(rackPinionMotorSizingModule, baselineInput());
    expect(asQuantity(result.outputs.load_torque).value).toBeGreaterThan(0);
    expect(
      asQuantity(result.outputs.acceleration_torque).value,
    ).toBeGreaterThan(0);
    expect(asQuantity(result.outputs.momentary_torque).value).toBeCloseTo(
      asQuantity(result.outputs.load_torque).value +
        asQuantity(result.outputs.acceleration_torque).value,
      9,
    );
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });

  it("a vertical scenario has a larger load_torque than the equivalent horizontal one (gravity fully loads the drive, not just mu*g)", () => {
    const horizontal = executeModule(
      rackPinionMotorSizingModule,
      baselineInput(),
    );
    const vertical = executeModule(rackPinionMotorSizingModule, verticalInput());
    expect(asQuantity(vertical.outputs.load_torque).value).toBeGreaterThan(
      asQuantity(horizontal.outputs.load_torque).value,
    );
  });

  it("gearing reduces reflected_load_inertia by gear_ratio^2 and reduces operating_speed is NOT expected -- speed instead SCALES UP with gear_ratio (motor spins faster than the pinion)", () => {
    const direct = executeModule(rackPinionMotorSizingModule, baselineInput());
    const geared = executeModule(rackPinionMotorSizingModule, gearedInput());

    expect(
      asQuantity(geared.outputs.reflected_load_inertia).value,
    ).toBeCloseTo(
      asQuantity(direct.outputs.reflected_load_inertia).value / 25,
      9,
    );
    expect(asQuantity(geared.outputs.operating_speed).value).toBeCloseTo(
      asQuantity(direct.outputs.operating_speed).value * 5,
      6,
    );
  });

  it("reports a warning (not a failure) on the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(rackPinionMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("warning");
  });

  it("resolves inertia_ratio_maximum to the recommended default of 10 when unset, and remains overridable", () => {
    const defaultInput = baselineInput();
    delete defaultInput.values.inertia_ratio_maximum;
    const defaultResult = executeModule(rackPinionMotorSizingModule, defaultInput);
    const defaultCheck = defaultResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(defaultCheck!.allowable!).value).toBeCloseTo(10, 9);

    const overriddenInput = baselineInput();
    overriddenInput.values.inertia_ratio_maximum = makeQuantity(5, "ratio");
    const overriddenResult = executeModule(
      rackPinionMotorSizingModule,
      overriddenInput,
    );
    const overriddenCheck = overriddenResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(overriddenCheck!.allowable!).value).toBeCloseTo(5, 9);
  });

  it("required_torque scales linearly with required_torque_safety_factor", () => {
    const input = baselineInput();
    const base = executeModule(rackPinionMotorSizingModule, input);
    const doubled = { ...input, values: { ...input.values } };
    doubled.values.required_torque_safety_factor = makeQuantity(4, "ratio");
    const result = executeModule(rackPinionMotorSizingModule, doubled);

    const baseRequired = asQuantity(base.outputs.required_torque).value;
    const doubledRequired = asQuantity(result.outputs.required_torque).value;
    expect(doubledRequired / baseRequired).toBeCloseTo(4 / 2, 9);
  });

  it("a longer acceleration_time reduces acceleration_torque and required_torque (monotonicity)", () => {
    const fastInput = baselineInput();
    fastInput.values.acceleration_time = makeQuantity(0.2, "s");
    const slowInput = baselineInput();
    slowInput.values.acceleration_time = makeQuantity(2, "s");

    const fast = executeModule(rackPinionMotorSizingModule, fastInput);
    const slow = executeModule(rackPinionMotorSizingModule, slowInput);

    expect(asQuantity(slow.outputs.acceleration_torque).value).toBeLessThan(
      asQuantity(fast.outputs.acceleration_torque).value,
    );
    expect(asQuantity(slow.outputs.required_torque).value).toBeLessThan(
      asQuantity(fast.outputs.required_torque).value,
    );
    expect(asQuantity(slow.outputs.load_torque).value).toBeCloseTo(
      asQuantity(fast.outputs.load_torque).value,
      12,
    );
  });

  it("rejects a non-positive pinion_pitch_diameter (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.pinion_pitch_diameter = makeQuantity(0, "m");
    expect(() => executeModule(rackPinionMotorSizingModule, input)).toThrow();
  });

  it("rejects a required_torque_safety_factor below 1 (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.required_torque_safety_factor = makeQuantity(0.5, "ratio");
    expect(() => executeModule(rackPinionMotorSizingModule, input)).toThrow();
  });

  it("serializes and deserializes outputs without semantic loss (round trip)", () => {
    const result = executeModule(rackPinionMotorSizingModule, baselineInput());
    const roundTripped = JSON.parse(JSON.stringify(result.outputs));
    expect(roundTripped.required_torque.value).toBeCloseTo(
      asQuantity(result.outputs.required_torque).value,
      12,
    );
    expect(roundTripped.required_torque.unit).toBe(
      asQuantity(result.outputs.required_torque).unit,
    );
  });
});
