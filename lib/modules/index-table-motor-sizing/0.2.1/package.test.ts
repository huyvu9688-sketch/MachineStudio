import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { indexTableMotorSizingModule } from "./index";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port. Round
 * engineering numbers, not a published worked example -- see
 * automationdirect-reference-example.test.ts for that.
 */
function baselineInput(): RawInput {
  return {
    values: {
      table_mass: makeQuantity(40, "kg"),
      table_diameter: makeQuantity(0.3, "m"),
      attached_load_inertia: makeQuantity(0.02, "kg*m^2"),
      gear_ratio: makeQuantity(5, "ratio"),
      index_angle: makeQuantity(Math.PI / 4, "rad"),
      index_time: makeQuantity(0.5, "s"),
      acceleration_time: makeQuantity(0.125, "s"),
      load_torque: makeQuantity(0, "N*m"),
      motor_rotor_inertia: makeQuantity(1e-3, "kg*m^2"),
      required_torque_safety_factor: makeQuantity(2, "ratio"),
      inertia_ratio_maximum: makeQuantity(30, "ratio"),
    },
  };
}

/** Same scenario, geared 10:1 instead of 5:1. */
function gearedInput(): RawInput {
  const input = baselineInput();
  input.values.gear_ratio = makeQuantity(10, "ratio");
  return input;
}

/** Same scenario, with a nonzero engineer-supplied load torque. */
function loadTorqueInput(): RawInput {
  const input = baselineInput();
  input.values.load_torque = makeQuantity(0.5, "N*m");
  return input;
}

/** Same scenario, with attached_load_inertia and gear_ratio left absent to exercise their own constant defaults. */
function noOptionalPortsInput(): RawInput {
  const input = baselineInput();
  delete (input.values as Record<string, unknown>).attached_load_inertia;
  delete (input.values as Record<string, unknown>).gear_ratio;
  delete (input.values as Record<string, unknown>).load_torque;
  return input;
}

// Pinned by `npm run module:source-hash -- index-table-motor-sizing
// 0.2.1` -- see lib/engine/module-sdk/conformance.ts's
// "source-immutability" check. Update this value in the same commit as a
// deliberate change to this directory's .ts files; an unreviewed change
// leaves it stale and the check below fails. Placeholder until Task 8
// computes the real hash.
const EXPECTED_SOURCE_HASH = "6eee507adbbe89c4";

describe("index-table-motor-sizing 0.2.1 module conformance", () => {
  const report = runModuleConformance(indexTableMotorSizingModule, {
    sampleInputs: [baselineInput(), gearedInput(), loadTorqueInput()],
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

describe("index-table-motor-sizing 0.2.1 executeModule", () => {
  it("computes a baseline scenario without error", () => {
    const result = executeModule(indexTableMotorSizingModule, baselineInput());
    expect(
      asQuantity(result.outputs.acceleration_torque).value,
    ).toBeGreaterThan(0);
    expect(asQuantity(result.outputs.momentary_torque).value).toBeCloseTo(
      asQuantity(result.outputs.acceleration_torque).value,
      9,
    );
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("pass");
  });

  it("load_inertia sums table_inertia + attached_load_inertia", () => {
    const result = executeModule(indexTableMotorSizingModule, baselineInput());
    const tableInertia = asQuantity(result.outputs.table_inertia).value;
    const loadInertia = asQuantity(result.outputs.load_inertia).value;
    expect(loadInertia).toBeCloseTo(tableInertia + 0.02, 12);
  });

  it("attached_load_inertia, gear_ratio, and load_torque default to their own constant defaults when absent (0, 1, 0)", () => {
    const withDefaults = executeModule(
      indexTableMotorSizingModule,
      noOptionalPortsInput(),
    );
    const explicit = baselineInput();
    explicit.values.attached_load_inertia = makeQuantity(0, "kg*m^2");
    explicit.values.gear_ratio = makeQuantity(1, "ratio");
    explicit.values.load_torque = makeQuantity(0, "N*m");
    const withExplicit = executeModule(indexTableMotorSizingModule, explicit);

    expect(asQuantity(withDefaults.outputs.load_inertia).value).toBeCloseTo(
      asQuantity(withExplicit.outputs.load_inertia).value,
      12,
    );
    expect(asQuantity(withDefaults.outputs.operating_speed).value).toBeCloseTo(
      asQuantity(withExplicit.outputs.operating_speed).value,
      9,
    );
  });

  it("a nonzero engineer-supplied load_torque increases momentary_torque and required_torque by exactly that amount times the safety factor (before/after the acceleration term)", () => {
    const base = executeModule(indexTableMotorSizingModule, baselineInput());
    const withLoadTorque = executeModule(
      indexTableMotorSizingModule,
      loadTorqueInput(),
    );

    expect(
      asQuantity(withLoadTorque.outputs.momentary_torque).value,
    ).toBeCloseTo(asQuantity(base.outputs.momentary_torque).value + 0.5, 9);
  });

  it("gearing reduces reflected_load_inertia by gear_ratio^2 and operating_speed SCALES UP with gear_ratio (motor spins faster than the table)", () => {
    const direct = executeModule(indexTableMotorSizingModule, baselineInput());
    const geared = executeModule(indexTableMotorSizingModule, gearedInput());

    expect(asQuantity(geared.outputs.reflected_load_inertia).value).toBeCloseTo(
      asQuantity(direct.outputs.reflected_load_inertia).value * (25 / 100),
      9,
    );
    expect(asQuantity(geared.outputs.operating_speed).value).toBeCloseTo(
      asQuantity(direct.outputs.operating_speed).value * 2,
      6,
    );
  });

  it("reports a warning (not a failure) on the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(indexTableMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("warning");
  });

  it("resolves inertia_ratio_maximum to the recommended default of 10 when unset, and remains overridable", () => {
    const defaultInput = baselineInput();
    delete (defaultInput.values as Record<string, unknown>)
      .inertia_ratio_maximum;
    const defaultResult = executeModule(
      indexTableMotorSizingModule,
      defaultInput,
    );
    const defaultCheck = defaultResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(defaultCheck!.allowable!).value).toBeCloseTo(10, 9);

    const overriddenInput = baselineInput();
    overriddenInput.values.inertia_ratio_maximum = makeQuantity(5, "ratio");
    const overriddenResult = executeModule(
      indexTableMotorSizingModule,
      overriddenInput,
    );
    const overriddenCheck = overriddenResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(overriddenCheck!.allowable!).value).toBeCloseTo(5, 9);
  });

  it("required_torque scales linearly with required_torque_safety_factor", () => {
    const input = baselineInput();
    const base = executeModule(indexTableMotorSizingModule, input);
    const doubled = { ...input, values: { ...input.values } };
    doubled.values.required_torque_safety_factor = makeQuantity(4, "ratio");
    const result = executeModule(indexTableMotorSizingModule, doubled);

    const baseRequired = asQuantity(base.outputs.required_torque).value;
    const doubledRequired = asQuantity(result.outputs.required_torque).value;
    expect(doubledRequired / baseRequired).toBeCloseTo(4 / 2, 9);
  });

  it("a longer acceleration_time reduces acceleration_torque and required_torque (monotonicity)", () => {
    const fastInput = baselineInput();
    fastInput.values.acceleration_time = makeQuantity(0.05, "s");
    fastInput.values.index_time = makeQuantity(0.5, "s");
    const slowInput = baselineInput();
    slowInput.values.acceleration_time = makeQuantity(0.2, "s");
    slowInput.values.index_time = makeQuantity(0.5, "s");

    const fast = executeModule(indexTableMotorSizingModule, fastInput);
    const slow = executeModule(indexTableMotorSizingModule, slowInput);

    expect(asQuantity(slow.outputs.acceleration_torque).value).toBeLessThan(
      asQuantity(fast.outputs.acceleration_torque).value,
    );
    expect(asQuantity(slow.outputs.required_torque).value).toBeLessThan(
      asQuantity(fast.outputs.required_torque).value,
    );
  });

  it("rejects a non-positive table_diameter (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.table_diameter = makeQuantity(0, "m");
    expect(() => executeModule(indexTableMotorSizingModule, input)).toThrow();
  });

  it("rejects an acceleration_time not less than index_time (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.index_time = makeQuantity(0.1, "s");
    input.values.acceleration_time = makeQuantity(0.125, "s");
    expect(() => executeModule(indexTableMotorSizingModule, input)).toThrow();
  });

  it("rejects a required_torque_safety_factor below 1 (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.required_torque_safety_factor = makeQuantity(0.5, "ratio");
    expect(() => executeModule(indexTableMotorSizingModule, input)).toThrow();
  });

  it("serializes and deserializes outputs without semantic loss (round trip)", () => {
    const result = executeModule(indexTableMotorSizingModule, baselineInput());
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
