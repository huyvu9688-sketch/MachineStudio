import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { couplingModule } from "./package";
import { asQuantity, type RawInput } from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port. Round
 * engineering numbers, not a published worked example (the kernel-level
 * reproduction of KTR's and R+W's own worked examples lives in
 * ./math.test.ts — see ./validation.ts for why that is not yet a full
 * Stage-4 reference example run through this module's own compute path).
 * Every case is kept comfortably within every applicable limit so the
 * baseline passes every check.
 */
function baselineInput(): RawInput {
  return {
    values: {
      lead: makeQuantity(0.01, "m"),
      // gear_ratio omitted deliberately: exercises the registry's constant
      // default (1, direct-connected) auto-fill in resolveModuleInput.
      rated_torque: makeQuantity(100, "N*m"),
      max_torque: makeQuantity(250, "N*m"),
      allowable_speed: makeQuantity(500, "rad/s"),
      torsional_stiffness: makeQuantity(5000, "N*m/rad"),
      moment_of_inertia: makeQuantity(0.001, "kg*m^2"),
      driving_bore_min: makeQuantity(0.008, "m"),
      driving_bore_max: makeQuantity(0.015, "m"),
      driven_bore_min: makeQuantity(0.008, "m"),
      driven_bore_max: makeQuantity(0.015, "m"),
      allowable_parallel_misalignment: makeQuantity(0.0005, "m"),
      allowable_angular_misalignment: makeQuantity(0.02, "rad"),
      allowable_axial_misalignment: makeQuantity(0.0005, "m"),
      actual_parallel_misalignment: makeQuantity(0.0002, "m"),
      actual_angular_misalignment: makeQuantity(0.005, "rad"),
      actual_axial_misalignment: makeQuantity(0.0001, "m"),
      driving_shaft_diameter: makeQuantity(0.01, "m"),
      driven_shaft_diameter: makeQuantity(0.01, "m"),
      service_factor: makeQuantity(1.5, "ratio"),
      normal_drive_torque: makeQuantity(30, "N*m"),
      normal_linear_velocity: makeQuantity(0.1, "m/s"),
      peak_drive_torque: makeQuantity(60, "N*m"),
      peak_linear_velocity: makeQuantity(0.15, "m/s"),
    },
  };
}

describe("coupling 0.1.0 module conformance", () => {
  const report = runModuleConformance(couplingModule, {
    sampleInputs: [baselineInput()],
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).not.toBe("fail");
    });
  }

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});

describe("coupling 0.1.0 boundary and invalid input", () => {
  it("requires the full set of catalog rating and installation ports", () => {
    const input = baselineInput();
    delete input.values.rated_torque;
    expect(() => executeModule(couplingModule, input)).toThrow();
  });

  it("requires the normal and peak per-case ports", () => {
    const input = baselineInput();
    delete input.values.peak_drive_torque;
    expect(() => executeModule(couplingModule, input)).toThrow();
  });

  it("rejects non-positive catalog ratings", () => {
    const input = baselineInput();
    input.values.rated_torque = makeQuantity(0, "N*m");
    expect(() => executeModule(couplingModule, input)).toThrow();
  });

  it("rejects a driving bore range whose minimum exceeds its maximum", () => {
    const input = baselineInput();
    input.values.driving_bore_min = makeQuantity(0.02, "m");
    input.values.driving_bore_max = makeQuantity(0.01, "m");
    expect(() => executeModule(couplingModule, input)).toThrow();
  });

  it("rejects a driven bore range whose minimum exceeds its maximum", () => {
    const input = baselineInput();
    input.values.driven_bore_min = makeQuantity(0.02, "m");
    input.values.driven_bore_max = makeQuantity(0.01, "m");
    expect(() => executeModule(couplingModule, input)).toThrow();
  });

  it("throws rather than report an infinite speed safety factor at exactly zero operating speed", () => {
    const input = baselineInput();
    input.values.peak_linear_velocity = makeQuantity(0, "m/s");
    expect(() => executeModule(couplingModule, input)).toThrow();
  });
});

describe("coupling 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(couplingModule, baselineInput());
    expect(computation.outputs.normal_torque_safety_factor).toMatchObject({
      unit: "ratio",
    });
    expect(computation.outputs.peak_torque_safety_factor).toMatchObject({
      unit: "ratio",
    });
    expect(computation.outputs.normal_speed_safety_factor).toMatchObject({
      unit: "ratio",
    });
    expect(computation.outputs.peak_speed_safety_factor).toMatchObject({
      unit: "ratio",
    });
  });

  it("computes the normal-case torque safety factor as rated_torque / (|drive_torque| * service_factor)", () => {
    const computation = executeModule(couplingModule, baselineInput());
    expect(
      asQuantity(computation.outputs.normal_torque_safety_factor).value,
    ).toBeCloseTo(100 / (30 * 1.5), 9);
  });

  it("computes the peak-case torque safety factor as max_torque / (|drive_torque| * service_factor)", () => {
    const computation = executeModule(couplingModule, baselineInput());
    expect(
      asQuantity(computation.outputs.peak_torque_safety_factor).value,
    ).toBeCloseTo(250 / (60 * 1.5), 9);
  });

  it("computes the speed safety factor from a locally-derived operating speed, not a screw.* speed port", () => {
    const computation = executeModule(couplingModule, baselineInput());
    // n = (0.1 / 0.01) * 2*pi * 1 = 62.8318... rad/s
    const expectedFactor = 500 / (10 * 2 * Math.PI);
    expect(
      asQuantity(computation.outputs.normal_speed_safety_factor).value,
    ).toBeCloseTo(expectedFactor, 6);
  });

  it("scales the operating speed by gear_ratio when supplied", () => {
    const input = baselineInput();
    input.values.gear_ratio = makeQuantity(3, "ratio");
    const computation = executeModule(couplingModule, input);
    // n = (0.1 / 0.01) * 2*pi * 3 = 3x the default-gear-ratio case
    const expectedFactor = 500 / (10 * 2 * Math.PI * 3);
    expect(
      asQuantity(computation.outputs.normal_speed_safety_factor).value,
    ).toBeCloseTo(expectedFactor, 6);
  });

  it("fails the torque-safety check when the required torque exceeds capacity", () => {
    const input = baselineInput();
    input.values.normal_drive_torque = makeQuantity(1000, "N*m");
    const computation = executeModule(couplingModule, input);
    const check = computation.checks.find(
      (c) => c.id === "torque-safety-normal",
    );
    expect(check?.status).toBe("fail");
  });

  it("fails the speed-safety check when the operating speed exceeds the allowable speed", () => {
    const input = baselineInput();
    input.values.allowable_speed = makeQuantity(1, "rad/s");
    const computation = executeModule(couplingModule, input);
    const check = computation.checks.find(
      (c) => c.id === "speed-safety-normal",
    );
    expect(check?.status).toBe("fail");
  });

  it("fails the parallel-misalignment check when the actual value exceeds the allowable value", () => {
    const input = baselineInput();
    input.values.actual_parallel_misalignment = makeQuantity(0.01, "m");
    const computation = executeModule(couplingModule, input);
    const check = computation.checks.find(
      (c) => c.id === "misalignment-parallel",
    );
    expect(check?.status).toBe("fail");
  });

  it("fails the driving-side bore-compatibility check when the shaft is too large", () => {
    const input = baselineInput();
    input.values.driving_shaft_diameter = makeQuantity(0.02, "m");
    const computation = executeModule(couplingModule, input);
    const check = computation.checks.find(
      (c) => c.id === "bore-compatibility-driving",
    );
    expect(check?.status).toBe("fail");
  });

  it("applies the same service factor to both the normal and peak torque checks", () => {
    const input = baselineInput();
    // Equal required torques and equal capacities isolate the service
    // factor's effect: both safety factors should come out identical.
    input.values.normal_drive_torque = makeQuantity(40, "N*m");
    input.values.peak_drive_torque = makeQuantity(40, "N*m");
    input.values.rated_torque = makeQuantity(200, "N*m");
    input.values.max_torque = makeQuantity(200, "N*m");
    const computation = executeModule(couplingModule, input);
    expect(
      asQuantity(computation.outputs.normal_torque_safety_factor).value,
    ).toBeCloseTo(
      asQuantity(computation.outputs.peak_torque_safety_factor).value,
      9,
    );
  });
});
