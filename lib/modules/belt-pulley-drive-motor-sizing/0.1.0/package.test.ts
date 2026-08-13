import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { beltPulleyDriveMotorSizingModule } from "./index";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port. Round
 * engineering numbers, not a published worked example -- see
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

/** Same scenario, geared 5:1 (motor spins faster than the pulley). */
function gearedInput(): RawInput {
  const input = baselineInput();
  input.values.gear_ratio = makeQuantity(5, "ratio");
  return input;
}

/** Same scenario, with belt_mass left absent to exercise its own constant default (0 kg). */
function noBeltMassInput(): RawInput {
  const input = baselineInput();
  delete (input.values as Record<string, unknown>).belt_mass;
  return input;
}

// Pinned by `npm run module:source-hash -- belt-pulley-drive-motor-sizing
// 0.1.0` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Update this value in the same commit as a
// deliberate change to this directory's .ts files; an unreviewed change
// leaves it stale and the check below fails.
const EXPECTED_SOURCE_HASH = "1f371cb2c7a12ab8";

describe("belt-pulley-drive-motor-sizing 0.1.0 module conformance", () => {
  const report = runModuleConformance(beltPulleyDriveMotorSizingModule, {
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

describe("belt-pulley-drive-motor-sizing 0.1.0 executeModule", () => {
  it("computes a baseline horizontal scenario without error", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
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

  it("load_inertia sums pulley_inertia + belt_inertia + the carriage's own linear-motion-equivalent inertia", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const pulleyInertia = asQuantity(result.outputs.pulley_inertia).value;
    const beltInertia = asQuantity(result.outputs.belt_inertia).value;
    const loadInertia = asQuantity(result.outputs.load_inertia).value;
    const carriageInertia = 50 * (0.08 / 2) ** 2;
    expect(loadInertia).toBeCloseTo(
      pulleyInertia + beltInertia + carriageInertia,
      12,
    );
  });

  it("belt_inertia defaults to exactly 0 when belt_mass is absent (registry constant default)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      noBeltMassInput(),
    );
    expect(asQuantity(result.outputs.belt_inertia).value).toBe(0);
  });

  it("a nonzero belt_mass increases load_inertia relative to belt_mass=0 (monotonicity)", () => {
    const withBelt = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const withoutBelt = executeModule(
      beltPulleyDriveMotorSizingModule,
      noBeltMassInput(),
    );
    expect(asQuantity(withBelt.outputs.load_inertia).value).toBeGreaterThan(
      asQuantity(withoutBelt.outputs.load_inertia).value,
    );
  });

  it("a vertical scenario has a larger load_torque than the equivalent horizontal one (gravity fully loads the drive, not just mu*g)", () => {
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

  it("gearing reduces reflected_load_inertia by gear_ratio^2 and operating_speed SCALES UP with gear_ratio (motor spins faster than the pulley)", () => {
    const direct = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
    const geared = executeModule(
      beltPulleyDriveMotorSizingModule,
      gearedInput(),
    );

    expect(asQuantity(geared.outputs.reflected_load_inertia).value).toBeCloseTo(
      asQuantity(direct.outputs.reflected_load_inertia).value / 25,
      9,
    );
    expect(asQuantity(geared.outputs.operating_speed).value).toBeCloseTo(
      asQuantity(direct.outputs.operating_speed).value * 5,
      6,
    );
  });

  it("fails the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(beltPulleyDriveMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("fail");
  });

  it("required_torque scales linearly with required_torque_safety_factor", () => {
    const input = baselineInput();
    const base = executeModule(beltPulleyDriveMotorSizingModule, input);
    const doubled = { ...input, values: { ...input.values } };
    doubled.values.required_torque_safety_factor = makeQuantity(4, "ratio");
    const result = executeModule(beltPulleyDriveMotorSizingModule, doubled);

    const baseRequired = asQuantity(base.outputs.required_torque).value;
    const doubledRequired = asQuantity(result.outputs.required_torque).value;
    expect(doubledRequired / baseRequired).toBeCloseTo(4 / 2, 9);
  });

  it("a longer acceleration_time reduces acceleration_torque and required_torque (monotonicity)", () => {
    const fastInput = baselineInput();
    fastInput.values.acceleration_time = makeQuantity(0.2, "s");
    const slowInput = baselineInput();
    slowInput.values.acceleration_time = makeQuantity(2, "s");

    const fast = executeModule(beltPulleyDriveMotorSizingModule, fastInput);
    const slow = executeModule(beltPulleyDriveMotorSizingModule, slowInput);

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

  it("rejects a non-positive pulley_pitch_diameter (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.pulley_pitch_diameter = makeQuantity(0, "m");
    expect(() =>
      executeModule(beltPulleyDriveMotorSizingModule, input),
    ).toThrow();
  });

  it("rejects a required_torque_safety_factor below 1 (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.required_torque_safety_factor = makeQuantity(0.5, "ratio");
    expect(() =>
      executeModule(beltPulleyDriveMotorSizingModule, input),
    ).toThrow();
  });

  it("serializes and deserializes outputs without semantic loss (round trip)", () => {
    const result = executeModule(
      beltPulleyDriveMotorSizingModule,
      baselineInput(),
    );
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
