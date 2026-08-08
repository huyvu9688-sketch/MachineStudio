import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
  type EngineeringValue,
} from "@/lib/engine";
import { axisHorizontalBasicFixture } from "@/tests/fixtures/axes/axis-horizontal-basic/fixture";
import { axisVerticalFixture } from "@/tests/fixtures/axes/axis-vertical/fixture";
import type { AxisHistoricalFixture } from "@/tests/fixtures/axes/fixture-types";
import { axisLoadCasesModule } from "./package";
import {
  asQuantity,
  orientationValue as orientation,
  travelDirectionValue as direction,
  type RawInput,
} from "./test-helpers";

/** A minimal, valid horizontal-axis scenario exercising every required port. */
function baselineInput(): RawInput {
  return {
    values: {
      orientation: orientation("horizontal"),
      incline_angle: makeQuantity(0, "rad"),
      total_moving_mass: makeQuantity(40, "kg"),
      friction_coefficient: makeQuantity(0.02, "ratio"),
      normal_travel_direction: direction("positive"),
      normal_axial_acceleration: makeQuantity(0, "m/s^2"),
      normal_guide_resistance_force: makeQuantity(0, "N"),
      peak_travel_direction: direction("positive"),
      peak_axial_acceleration: makeQuantity(6.666666666666667, "m/s^2"),
      peak_guide_resistance_force: makeQuantity(0, "N"),
      // gravity omitted deliberately: exercises the registry's constant
      // default (9.80665 m/s^2) auto-fill in resolveModuleInput.
    },
  };
}

describe("axis-load-cases 0.1.0 module conformance", () => {
  const report = runModuleConformance(axisLoadCasesModule, {
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

describe("axis-load-cases 0.1.0 mass-route validation", () => {
  it("rejects an input with both total and breakdown mass routes", () => {
    const input = baselineInput();
    input.values.payload_mass = makeQuantity(25, "kg");
    input.values.carriage_mass = makeQuantity(15, "kg");
    expect(() => executeModule(axisLoadCasesModule, input)).toThrow();
  });

  it("rejects an input with neither mass route", () => {
    const input = baselineInput();
    delete input.values.total_moving_mass;
    expect(() => executeModule(axisLoadCasesModule, input)).toThrow();
  });

  it("rejects an incomplete breakdown (payload without carriage)", () => {
    const input = baselineInput();
    delete input.values.total_moving_mass;
    input.values.payload_mass = makeQuantity(25, "kg");
    expect(() => executeModule(axisLoadCasesModule, input)).toThrow();
  });

  it("accepts the complete payload/carriage breakdown route", () => {
    const input = baselineInput();
    delete input.values.total_moving_mass;
    input.values.payload_mass = makeQuantity(25, "kg");
    input.values.carriage_mass = makeQuantity(15, "kg");
    const computation = executeModule(axisLoadCasesModule, input);
    expect(computation.outputs.total_moving_mass).toEqual(
      makeQuantity(40, "kg"),
    );
  });
});

describe("axis-load-cases 0.1.0 boundary and invalid input", () => {
  it("rejects a friction coefficient outside the released [0, 1] range", () => {
    const input = baselineInput();
    input.values.friction_coefficient = makeQuantity(1.5, "ratio");
    expect(() => executeModule(axisLoadCasesModule, input)).toThrow();
  });

  it("requires the normal and peak per-case ports", () => {
    const input = baselineInput();
    delete input.values.peak_travel_direction;
    expect(() => executeModule(axisLoadCasesModule, input)).toThrow();
  });
});

describe("axis-load-cases 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(axisLoadCasesModule, baselineInput());
    expect(computation.outputs.total_moving_mass.kind).toBe("quantity");
    expect(computation.outputs.total_moving_mass).toMatchObject({ unit: "kg" });
    expect(computation.outputs.gravitational_force).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.normal_thrust_force).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.peak_thrust_force).toMatchObject({ unit: "N" });
  });

  it("resolves zero thrust at rest with no friction, resistance, or incline", () => {
    const input = baselineInput();
    input.values.friction_coefficient = makeQuantity(0, "ratio");
    input.values.peak_axial_acceleration = makeQuantity(0, "m/s^2");
    const computation = executeModule(axisLoadCasesModule, input);
    expect(
      asQuantity(computation.outputs.normal_thrust_force).value,
    ).toBeCloseTo(0, 9);
    expect(asQuantity(computation.outputs.peak_thrust_force).value).toBeCloseTo(
      0,
      9,
    );
    expect(
      asQuantity(computation.outputs.gravitational_force).value,
    ).toBeCloseTo(0, 9);
  });

  it("reports the full gravitational force axially for a vertical axis at rest", () => {
    const input: RawInput = {
      values: {
        orientation: orientation("vertical"),
        incline_angle: makeQuantity(Math.PI / 2, "rad"),
        total_moving_mass: makeQuantity(30, "kg"),
        gravity: makeQuantity(9.80665, "m/s^2"),
        normal_travel_direction: direction("positive"),
        normal_axial_acceleration: makeQuantity(0, "m/s^2"),
        normal_guide_resistance_force: makeQuantity(0, "N"),
        peak_travel_direction: direction("positive"),
        peak_axial_acceleration: makeQuantity(0, "m/s^2"),
        peak_guide_resistance_force: makeQuantity(0, "N"),
      },
    };
    const computation = executeModule(axisLoadCasesModule, input);
    // Weight acts against +X (upward); zero friction/resistance/acceleration
    // means the required thrust exactly balances gravity.
    expect(
      asQuantity(computation.outputs.gravitational_force).value,
    ).toBeCloseTo(-30 * 9.80665, 6);
    expect(
      asQuantity(computation.outputs.normal_thrust_force).value,
    ).toBeCloseTo(30 * 9.80665, 6);
  });
});

/**
 * Reproduces published historical source-phase force magnitudes through the
 * full module package (not just the ./math.ts kernel — see
 * ./axis-load-cases.test.ts for the kernel-level regression). ID39/ID42 do
 * not state which of their three motion phases is a `normal` or `peak`
 * product load case (context/modules/axis-load-cases/stage-2-contract.md);
 * this test does not assert one. It feeds each fixture's known physical
 * scenarios into both required case ports (arbitrary slot assignment) purely
 * to exercise the module's compute path, and checks that each case's
 * independently resolved thrust output reproduces the known magnitude for
 * the physical scenario placed in that slot.
 */
function historicalInput(
  fixture: AxisHistoricalFixture,
  normalPhaseId: string,
  peakPhaseId: string,
): RawInput {
  const inputs = fixture.normalizedInputs;
  const phaseAcceleration = (phaseId: string) => {
    const phase = inputs.motionPhases.find(
      (candidate) => candidate.id === phaseId,
    );
    if (phase?.acceleration === null || phase?.acceleration === undefined) {
      throw new Error(
        `Fixture phase "${phaseId}" lacks an acceleration value.`,
      );
    }
    return phase.acceleration.value;
  };
  if (inputs.inclineAngle === null) {
    throw new Error("Fixture lacks an incline angle.");
  }

  return {
    values: {
      orientation: orientation(inputs.orientation),
      incline_angle: makeQuantity(inputs.inclineAngle.value, "rad"),
      total_moving_mass: makeQuantity(
        inputs.masses.totalMovingMass.value,
        "kg",
      ),
      gravity: makeQuantity(inputs.gravity.value, "m/s^2"),
      friction_coefficient: makeQuantity(
        inputs.frictionCoefficient?.value ?? 0,
        "ratio",
      ),
      // Neither fixture states a signed travel-direction convention; "positive"
      // is a local test convention only (see ./axis-load-cases.test.ts).
      normal_travel_direction: direction("positive"),
      normal_axial_acceleration: makeQuantity(
        phaseAcceleration(normalPhaseId),
        "m/s^2",
      ),
      normal_guide_resistance_force: makeQuantity(0, "N"),
      peak_travel_direction: direction("positive"),
      peak_axial_acceleration: makeQuantity(
        phaseAcceleration(peakPhaseId),
        "m/s^2",
      ),
      peak_guide_resistance_force: makeQuantity(0, "N"),
    },
  };
}

function expectedMagnitude(fixture: AxisHistoricalFixture, phaseId: string) {
  const expected = fixture.expectedResults.axisLoadCases.find(
    (candidate) => candidate.id === phaseId,
  );
  if (expected === undefined) {
    throw new Error(`Fixture is missing expected result "${phaseId}".`);
  }
  expect(expected.intendedModuleMapping.status).toBe("unclassified");
  return expected;
}

function assertCaseMagnitude(
  computedThrust: EngineeringValue,
  fixture: AxisHistoricalFixture,
  phaseId: string,
): void {
  const expected = expectedMagnitude(fixture, phaseId);
  const difference = Math.abs(
    Math.abs(asQuantity(computedThrust).value) - expected.normalized.value,
  );
  expect(difference).toBeLessThanOrEqual(expected.tolerance.absolute.value);
}

describe("axis-load-cases 0.1.0 historical regression (full module)", () => {
  it("reproduces ID39 horizontal acceleration and constant-speed magnitudes", () => {
    const computation = executeModule(
      axisLoadCasesModule,
      historicalInput(
        axisHorizontalBasicFixture,
        "acceleration",
        "constant-speed",
      ),
    );
    assertCaseMagnitude(
      computation.outputs.normal_thrust_force,
      axisHorizontalBasicFixture,
      "acceleration",
    );
    assertCaseMagnitude(
      computation.outputs.peak_thrust_force,
      axisHorizontalBasicFixture,
      "constant-speed",
    );
  });

  it("reproduces the ID39 horizontal deceleration magnitude", () => {
    const computation = executeModule(
      axisLoadCasesModule,
      historicalInput(
        axisHorizontalBasicFixture,
        "deceleration",
        "deceleration",
      ),
    );
    assertCaseMagnitude(
      computation.outputs.normal_thrust_force,
      axisHorizontalBasicFixture,
      "deceleration",
    );
  });

  it("reproduces ID42 vertical acceleration and constant-speed magnitudes", () => {
    const computation = executeModule(
      axisLoadCasesModule,
      historicalInput(axisVerticalFixture, "acceleration", "constant-speed"),
    );
    assertCaseMagnitude(
      computation.outputs.normal_thrust_force,
      axisVerticalFixture,
      "acceleration",
    );
    assertCaseMagnitude(
      computation.outputs.peak_thrust_force,
      axisVerticalFixture,
      "constant-speed",
    );
  });

  it("reproduces the ID42 vertical deceleration magnitude", () => {
    const computation = executeModule(
      axisLoadCasesModule,
      historicalInput(axisVerticalFixture, "deceleration", "deceleration"),
    );
    assertCaseMagnitude(
      computation.outputs.normal_thrust_force,
      axisVerticalFixture,
      "deceleration",
    );
  });
});
