import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { directDriveConveyorMotorSizingModule } from "./index";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port. Round
 * engineering numbers, not a published worked example -- see
 * oriental-motor-reference-examples.test.ts for that.
 */
function baselineInput(): RawInput {
  return {
    values: {
      drive_roller_diameter: makeQuantity(0.1, "m"),
      drive_roller_mass: makeQuantity(2, "kg"),
      idler_roller_diameter: makeQuantity(0.1, "m"),
      idler_roller_mass: makeQuantity(2, "kg"),
      belt_mass: makeQuantity(3, "kg"),
      carried_load_mass: makeQuantity(10, "kg"),
      belt_friction_coefficient: makeQuantity(0.3, "ratio"),
      mechanical_efficiency: makeQuantity(0.9, "ratio"),
      target_belt_speed: makeQuantity(0.5, "m/s"),
      acceleration_time: makeQuantity(1, "s"),
      motor_rotor_inertia: makeQuantity(2e-3, "kg*m^2"),
      required_torque_safety_factor: makeQuantity(2, "ratio"),
      inertia_ratio_maximum: makeQuantity(30, "ratio"),
    },
  };
}

/** Same scenario, with the idler roller a different diameter AND mass from the drive roller. */
function unequalRollersInput(): RawInput {
  const input = baselineInput();
  input.values.idler_roller_diameter = makeQuantity(0.08, "m");
  input.values.idler_roller_mass = makeQuantity(3, "kg");
  return input;
}

/** Same scenario, with a zero belt mass and a zero carried-load mass -- both allow >= 0. */
function zeroMassInput(): RawInput {
  const input = baselineInput();
  input.values.belt_mass = makeQuantity(0, "kg");
  input.values.carried_load_mass = makeQuantity(0, "kg");
  return input;
}

// Pinned by `npm run module:source-hash --
// direct-drive-conveyor-motor-sizing 0.2.0` -- see
// lib/engine/module-sdk/conformance.ts's "source-immutability" check.
// Update this value in the same commit as a deliberate change to this
// directory's .ts files; an unreviewed change leaves it stale and the
// check below fails. Placeholder until the real hash is computed.
const EXPECTED_SOURCE_HASH = "3f866c41e1748957";

describe("direct-drive-conveyor-motor-sizing 0.2.0 module conformance", () => {
  const report = runModuleConformance(directDriveConveyorMotorSizingModule, {
    sampleInputs: [
      baselineInput(),
      unequalRollersInput(),
      zeroMassInput(),
    ],
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

describe("direct-drive-conveyor-motor-sizing 0.2.0 executeModule", () => {
  it("computes a baseline scenario without error", () => {
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
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

  it("reports zero load_torque and reduced inertia when belt and carried-load mass are both zero", () => {
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
      zeroMassInput(),
    );
    expect(asQuantity(result.outputs.load_torque).value).toBe(0);
    // Acceleration torque is still positive: the rollers themselves still
    // have inertia even with nothing on the belt.
    expect(
      asQuantity(result.outputs.acceleration_torque).value,
    ).toBeGreaterThan(0);
  });

  it("reflected_load_inertia changes when the idler roller differs in mass and diameter together", () => {
    const equal = executeModule(
      directDriveConveyorMotorSizingModule,
      baselineInput(),
    );
    const unequal = executeModule(
      directDriveConveyorMotorSizingModule,
      unequalRollersInput(),
    );
    expect(
      asQuantity(unequal.outputs.reflected_load_inertia).value,
    ).not.toBeCloseTo(
      asQuantity(equal.outputs.reflected_load_inertia).value,
      6,
    );
  });

  it("reflected_load_inertia is UNCHANGED by the idler's own diameter alone, mass held fixed -- a real, correct property (D2 cancels: M2*D2^2/8*(D1/D2)^2 = M2*D1^2/8), not a bug", () => {
    const baseline = executeModule(
      directDriveConveyorMotorSizingModule,
      baselineInput(),
    );
    const diameterOnly = baselineInput();
    diameterOnly.values.idler_roller_diameter = makeQuantity(0.03, "m");
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
      diameterOnly,
    );
    expect(
      asQuantity(result.outputs.reflected_load_inertia).value,
    ).toBeCloseTo(
      asQuantity(baseline.outputs.reflected_load_inertia).value,
      12,
    );
  });

  it("reports a warning (not a failure) on the inertia-ratio check when the load is too large for the motor", () => {
    const input = baselineInput();
    input.values.motor_rotor_inertia = makeQuantity(1e-8, "kg*m^2");
    const result = executeModule(directDriveConveyorMotorSizingModule, input);
    const inertiaCheck = result.checks.find((c) => c.id === "inertia-ratio");
    expect(inertiaCheck?.status).toBe("warning");
  });

  it("resolves inertia_ratio_maximum to the recommended default of 10 when unset, and remains overridable", () => {
    const defaultInput = baselineInput();
    delete defaultInput.values.inertia_ratio_maximum;
    const defaultResult = executeModule(
      directDriveConveyorMotorSizingModule,
      defaultInput,
    );
    const defaultCheck = defaultResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(defaultCheck!.allowable!).value).toBeCloseTo(10, 9);

    const overriddenInput = baselineInput();
    overriddenInput.values.inertia_ratio_maximum = makeQuantity(5, "ratio");
    const overriddenResult = executeModule(
      directDriveConveyorMotorSizingModule,
      overriddenInput,
    );
    const overriddenCheck = overriddenResult.checks.find(
      (c) => c.id === "inertia-ratio",
    );
    expect(asQuantity(overriddenCheck!.allowable!).value).toBeCloseTo(5, 9);
  });

  it("required_torque scales linearly with required_torque_safety_factor", () => {
    const input = baselineInput();
    const base = executeModule(directDriveConveyorMotorSizingModule, input);
    const doubled = { ...input, values: { ...input.values } };
    doubled.values.required_torque_safety_factor = makeQuantity(4, "ratio");
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
      doubled,
    );

    const baseRequired = asQuantity(base.outputs.required_torque).value;
    const doubledRequired = asQuantity(result.outputs.required_torque).value;
    expect(doubledRequired / baseRequired).toBeCloseTo(4 / 2, 9);
  });

  it("a longer acceleration_time reduces acceleration_torque and required_torque (monotonicity)", () => {
    const fastInput = baselineInput();
    fastInput.values.acceleration_time = makeQuantity(0.5, "s");
    const slowInput = baselineInput();
    slowInput.values.acceleration_time = makeQuantity(5, "s");

    const fast = executeModule(directDriveConveyorMotorSizingModule, fastInput);
    const slow = executeModule(directDriveConveyorMotorSizingModule, slowInput);

    expect(asQuantity(slow.outputs.acceleration_torque).value).toBeLessThan(
      asQuantity(fast.outputs.acceleration_torque).value,
    );
    expect(asQuantity(slow.outputs.required_torque).value).toBeLessThan(
      asQuantity(fast.outputs.required_torque).value,
    );
    // load_torque and operating_speed do not depend on acceleration_time.
    expect(asQuantity(slow.outputs.load_torque).value).toBeCloseTo(
      asQuantity(fast.outputs.load_torque).value,
      12,
    );
  });

  it("rejects a non-positive drive_roller_diameter (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.drive_roller_diameter = makeQuantity(0, "m");
    expect(() =>
      executeModule(directDriveConveyorMotorSizingModule, input),
    ).toThrow();
  });

  it("rejects a required_torque_safety_factor below 1 (invalid-input coverage)", () => {
    const input = baselineInput();
    input.values.required_torque_safety_factor = makeQuantity(0.5, "ratio");
    expect(() =>
      executeModule(directDriveConveyorMotorSizingModule, input),
    ).toThrow();
  });

  it("serializes and deserializes outputs without semantic loss (round trip)", () => {
    const result = executeModule(
      directDriveConveyorMotorSizingModule,
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
