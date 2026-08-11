import { describe, expect, it } from "vitest";
import {
  deserializeCalculationTrace,
  executeModule,
  makeQuantity,
  parseModuleComputation,
  runModuleConformance,
  serializeCalculationTrace,
  traceStepIds,
  walkTrace,
  type EngineeringValue,
  type TraceStep,
} from "@/lib/engine";
import { axisHorizontalBasicFixture } from "@/tests/fixtures/axes/axis-horizontal-basic/fixture";
import { axisVerticalFixture } from "@/tests/fixtures/axes/axis-vertical/fixture";
import type { AxisHistoricalFixture } from "@/tests/fixtures/axes/fixture-types";
import { linearAxisDefinition } from "@/lib/workflows/linear-axis/1.0.0/definition";
import { axisLoadCasesModule } from "./package";
import {
  asQuantity,
  asVectorQuantity,
  orientationValue as orientation,
  travelDirectionValue as direction,
  type RawInput,
} from "./test-helpers";
import { makeAxisVector } from "./values";

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
    expect(computation.outputs.normal_resultant_force).toMatchObject({
      kind: "vector_quantity",
      unit: "N",
      frame: "axis",
    });
    expect(computation.outputs.peak_resultant_force).toMatchObject({
      kind: "vector_quantity",
      unit: "N",
      frame: "axis",
    });
    expect(computation.outputs.normal_resultant_moment).toMatchObject({
      kind: "vector_quantity",
      unit: "N*m",
      frame: "axis",
    });
    expect(computation.outputs.peak_resultant_moment).toMatchObject({
      kind: "vector_quantity",
      unit: "N*m",
      frame: "axis",
    });
  });

  it("resolves the full resultant force/moment vector, not just the axial scalar", () => {
    // Added for linear-guide (Unit 4.4) — context/modules/linear-guide/
    // stage-1-spec.md "A Real, Already-Documented Dependency Gap". A
    // center-of-mass offset and a lateral external force/moment produce
    // nonzero Y/Z components that motion.axis.thrust_force (the axial-only
    // scalar) cannot express.
    const input: RawInput = {
      values: {
        orientation: orientation("horizontal"),
        incline_angle: makeQuantity(0, "rad"),
        total_moving_mass: makeQuantity(10, "kg"),
        gravity: makeQuantity(10, "m/s^2"),
        center_of_mass_offset: makeAxisVector([0, 0.2, 0], "m"),
        normal_travel_direction: direction("positive"),
        normal_axial_acceleration: makeQuantity(0, "m/s^2"),
        normal_guide_resistance_force: makeQuantity(0, "N"),
        normal_external_force: makeAxisVector([0, 3, 0], "N"),
        normal_external_moment: makeAxisVector([5, 0, 0], "N*m"),
        peak_travel_direction: direction("positive"),
        peak_axial_acceleration: makeQuantity(0, "m/s^2"),
        peak_guide_resistance_force: makeQuantity(0, "N"),
      },
    };
    const computation = executeModule(axisLoadCasesModule, input);

    // Hand-derived: gravitationalForceN = [0, 0, -100] (10 kg * 10 m/s^2,
    // horizontal so no axial component); gravitationalMomentNm =
    // centerOfMass x gravitationalForceN = [0,0.2,0] x [0,0,-100] =
    // [-20, 0, 0]; friction and guide resistance are both zero here, so
    // resultantAppliedForceN = gravitationalForceN + externalForceN =
    // [0, 3, -100]; resultantAppliedMomentNm = gravitationalMomentNm +
    // externalMomentNm = [-20 + 5, 0, 0] = [-15, 0, 0].
    const resultantForce = asVectorQuantity(
      computation.outputs.normal_resultant_force,
    );
    const resultantMoment = asVectorQuantity(
      computation.outputs.normal_resultant_moment,
    );
    expect(resultantForce.components[0]).toBeCloseTo(0, 9);
    expect(resultantForce.components[1]).toBeCloseTo(3, 9);
    expect(resultantForce.components[2]).toBeCloseTo(-100, 9);
    expect(resultantMoment.components[0]).toBeCloseTo(-15, 9);
    expect(resultantMoment.components[1]).toBeCloseTo(0, 9);
    expect(resultantMoment.components[2]).toBeCloseTo(0, 9);
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

/** Finds a step by ID anywhere in a trace, or throws (test-only helper). */
function findTraceStep(
  trace: ReturnType<typeof executeModule>["trace"],
  stepId: string,
): TraceStep {
  let found: TraceStep | undefined;
  walkTrace(trace, {
    step: (step) => {
      if (step.id === stepId) found = step;
    },
  });
  if (found === undefined) {
    throw new Error(`Trace is missing step "${stepId}".`);
  }
  return found;
}

describe("axis-load-cases 0.1.0 usage and environment context (Task 3)", () => {
  it("declares optional trace-only duty_cycle and ambient_temperature ports", () => {
    const dutyCyclePort = axisLoadCasesModule.ports.inputs.find(
      (port) => port.key === "duty_cycle",
    );
    const ambientTemperaturePort = axisLoadCasesModule.ports.inputs.find(
      (port) => port.key === "ambient_temperature",
    );
    expect(dutyCyclePort).toMatchObject({
      key: "duty_cycle",
      parameterId: "motion.axis.duty_cycle",
      required: false,
    });
    expect(ambientTemperaturePort).toMatchObject({
      key: "ambient_temperature",
      parameterId: "env.ambient_temperature",
      required: false,
    });
  });

  it("records explicit no-context notes when neither optional value is supplied", () => {
    const computation = executeModule(axisLoadCasesModule, baselineInput());
    expect(traceStepIds(computation.trace)).toContain("usage-context");
    const step = findTraceStep(computation.trace, "usage-context");
    expect(step.inputs).toEqual([]);
    expect(step.notes).toEqual([
      "No duty-cycle context supplied; no per-case force default is inferred.",
      "No ambient-temperature context supplied; no universal derating is inferred.",
    ]);
  });

  it("records both context inputs when supplied, and leaves every normal/peak force and moment output unchanged", () => {
    const baseline = baselineInput();
    const contextual = baselineInput();
    contextual.values.duty_cycle = makeQuantity(0.6, "ratio");
    contextual.values.ambient_temperature = makeQuantity(313.15, "K");

    const baselineComputation = executeModule(axisLoadCasesModule, baseline);
    const contextualComputation = executeModule(axisLoadCasesModule, contextual);

    const step = findTraceStep(contextualComputation.trace, "usage-context");
    expect(step.inputs).toEqual([
      {
        label: "Duty cycle",
        value: makeQuantity(0.6, "ratio"),
        ref: "motion.axis.duty_cycle",
      },
      {
        label: "Ambient temperature",
        value: makeQuantity(313.15, "K"),
        ref: "env.ambient_temperature",
      },
    ]);
    expect(step.notes).toEqual([
      "Duty cycle is recorded as usage context only; it does not alter a per-case force.",
      "Ambient temperature is recorded as usage context only; no universal derating is applied.",
    ]);

    // The whole point of this task: these context-only inputs must never
    // change a computed force or moment (context/modules/axis-load-cases/
    // stage-2-contract.md). Every normal/peak force and moment output port
    // (./manifest.ts `ports.outputs`) must be byte-for-byte identical
    // between the baseline and contextual runs.
    const forceAndMomentKeys = [
      "normal_thrust_force",
      "peak_thrust_force",
      "normal_resultant_force",
      "peak_resultant_force",
      "normal_resultant_moment",
      "peak_resultant_moment",
    ] as const;
    for (const key of forceAndMomentKeys) {
      expect(contextualComputation.outputs[key]).toEqual(
        baselineComputation.outputs[key],
      );
    }
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

describe("linear-axis@1 workflow role (Unit 4.8)", () => {
  it("declares a workflowRoles entry matching a real linear-axis@1 role", () => {
    const roleIds = new Set(linearAxisDefinition.roles.map((r) => r.id));
    expect(axisLoadCasesModule.manifest.workflowRoles.length).toBeGreaterThan(
      0,
    );
    for (const roleId of axisLoadCasesModule.manifest.workflowRoles) {
      expect(roleIds.has(roleId)).toBe(true);
    }
  });
});

describe("axis-load-cases 0.1.0 trace structure (Task 4)", () => {
  it("produces a stable, ordered trace-step-ID snapshot for the baseline scenario", () => {
    // Intentional compatibility snapshot: a future trace change (step
    // reordering, renaming, addition, or removal) must update this list
    // deliberately, not accidentally.
    const computation = executeModule(axisLoadCasesModule, baselineInput());
    expect(traceStepIds(computation.trace)).toEqual([
      "axis-frame-definition",
      "gravity-vector-resolution",
      "total-moving-mass",
      "gravity-force",
      "gravity-moment",
      "running-resistance-normal",
      "external-load-normal",
      "resolved-moment-normal",
      "resultant-applied-force-normal",
      "running-resistance-peak",
      "external-load-peak",
      "resolved-moment-peak",
      "resultant-applied-force-peak",
      "required-thrust-normal",
      "required-thrust-peak",
      "usage-context",
      "validity-notes",
    ]);
  });
});

describe("axis-load-cases 0.1.0 module-computation and trace serialization round-trip (Task 4)", () => {
  it("round-trips a module computation through a JSON wire format unchanged", () => {
    // This project persists calculation runs as JSON; a computation that
    // does not survive a wire round-trip cannot be replayed from storage.
    const computation = executeModule(axisLoadCasesModule, baselineInput());
    const wireValue = JSON.parse(JSON.stringify(computation));
    expect(parseModuleComputation(wireValue)).toEqual(computation);
  });

  it("round-trips a calculation trace through serialize/deserialize unchanged", () => {
    const computation = executeModule(axisLoadCasesModule, baselineInput());
    expect(
      deserializeCalculationTrace(serializeCalculationTrace(computation.trace)),
    ).toEqual(computation.trace);
  });
});

describe("axis-load-cases 0.1.0 monotonicity (Task 4)", () => {
  it("increases normal_thrust_force strictly with moving mass on a horizontal axis (fixed positive acceleration and friction)", () => {
    // Horizontal (incline = 0): gravity has no axial component, so
    // required thrust is inertia plus Coulomb friction on the full
    // gravity-derived normal load: normal_thrust_force = m*(a + mu*g).
    // Both terms scale linearly with mass at fixed a and mu, so more mass
    // strictly requires more thrust.
    const masses = [10, 20, 40];
    const thrusts = masses.map((mass) => {
      const input = baselineInput();
      input.values.total_moving_mass = makeQuantity(mass, "kg");
      input.values.normal_axial_acceleration = makeQuantity(1, "m/s^2");
      const computation = executeModule(axisLoadCasesModule, input);
      return asQuantity(computation.outputs.normal_thrust_force).value;
    });
    expect(thrusts[1]).toBeGreaterThan(thrusts[0]);
    expect(thrusts[2]).toBeGreaterThan(thrusts[1]);
  });

  it("increases normal_thrust_force strictly with signed normal acceleration on a vertical positive-travel axis (fixed mass)", () => {
    // Vertical (incline = pi/2): gravity acts entirely along the axis, so
    // required thrust is inertia plus weight: normal_thrust_force =
    // m*(a + g) (the Coulomb normal load is m*g*cos(pi/2) = 0, so the
    // friction term vanishes regardless of mu here). At fixed mass, thrust
    // is affine and strictly increasing in signed acceleration.
    const accelerations = [-1, 0, 1];
    const thrusts = accelerations.map((normalAxialAcceleration) => {
      const input: RawInput = {
        values: {
          orientation: orientation("vertical"),
          incline_angle: makeQuantity(Math.PI / 2, "rad"),
          total_moving_mass: makeQuantity(30, "kg"),
          gravity: makeQuantity(9.80665, "m/s^2"),
          normal_travel_direction: direction("positive"),
          normal_axial_acceleration: makeQuantity(
            normalAxialAcceleration,
            "m/s^2",
          ),
          normal_guide_resistance_force: makeQuantity(0, "N"),
          peak_travel_direction: direction("positive"),
          peak_axial_acceleration: makeQuantity(0, "m/s^2"),
          peak_guide_resistance_force: makeQuantity(0, "N"),
        },
      };
      const computation = executeModule(axisLoadCasesModule, input);
      return asQuantity(computation.outputs.normal_thrust_force).value;
    });
    expect(thrusts[1]).toBeGreaterThan(thrusts[0]);
    expect(thrusts[2]).toBeGreaterThan(thrusts[1]);
  });
});
