import { describe, expect, it } from "vitest";
import { axisHorizontalBasicFixture } from "@/tests/fixtures/axes/axis-horizontal-basic/fixture";
import { axisVerticalFixture } from "@/tests/fixtures/axes/axis-vertical/fixture";
import {
  AxisLoadPhaseInputError,
  type AxisLoadPhaseInput,
  resolveAxisLoadPhase,
} from "./math";

function sourcePhase(
  fixture: typeof axisHorizontalBasicFixture | typeof axisVerticalFixture,
  phaseId: string,
) {
  const phase = fixture.normalizedInputs.motionPhases.find(
    (candidate) => candidate.id === phaseId,
  );
  const expected = fixture.expectedResults.axisLoadCases.find(
    (candidate) => candidate.id === phaseId,
  );
  if (phase === undefined || expected === undefined) {
    throw new Error(`Fixture phase "${phaseId}" is incomplete.`);
  }
  return { phase, expected };
}

function historicalPhaseInput(
  fixture: typeof axisHorizontalBasicFixture | typeof axisVerticalFixture,
  phaseId: string,
  travelDirection: "positive" | "negative",
): AxisLoadPhaseInput {
  const { phase } = sourcePhase(fixture, phaseId);
  const mass = fixture.normalizedInputs.masses.totalMovingMass.value;
  const gravity = fixture.normalizedInputs.gravity.value;
  const inclineAngle = fixture.normalizedInputs.inclineAngle;

  if (inclineAngle === null || phase.acceleration === null) {
    throw new Error(
      `Fixture phase "${phaseId}" lacks a required source value.`,
    );
  }

  return {
    orientation: fixture.normalizedInputs.orientation,
    inclineAngleRad: inclineAngle.value,
    totalMovingMassKg: mass,
    gravityMps2: gravity,
    frictionCoefficient:
      fixture.normalizedInputs.frictionCoefficient?.value ?? 0,
    // The historical sources provide no separate normal-load parameter. For
    // their simple axis geometry, the gravity-normal component is explicit.
    normalLoadN: mass * gravity * Math.cos(inclineAngle.value),
    guideResistanceN: 0,
    travelDirection,
    axialAccelerationMps2: phase.acceleration.value,
  };
}

function expectHistoricalMagnitude(
  fixture: typeof axisHorizontalBasicFixture | typeof axisVerticalFixture,
  phaseId: string,
  travelDirection: "positive" | "negative",
): void {
  const { expected } = sourcePhase(fixture, phaseId);
  const result = resolveAxisLoadPhase(
    historicalPhaseInput(fixture, phaseId, travelDirection),
  );
  const difference = Math.abs(
    Math.abs(result.requiredAxialDriveForceN) - expected.normalized.value,
  );

  expect(expected.intendedModuleMapping.loadCase).toBe("unclassified");
  expect(expected.intendedModuleMapping.status).toBe("unclassified");
  expect(difference).toBeLessThanOrEqual(expected.tolerance.absolute.value);
}

describe("axis-load-cases historical regression", () => {
  it("reproduces ID39 horizontal source-phase force magnitudes without inventing case categories", () => {
    // ID39 does not state a signed positive-travel convention. Positive is a
    // local test convention used only to reproduce the three source magnitudes.
    expectHistoricalMagnitude(
      axisHorizontalBasicFixture,
      "acceleration",
      "positive",
    );
    expectHistoricalMagnitude(
      axisHorizontalBasicFixture,
      "constant-speed",
      "positive",
    );
    expectHistoricalMagnitude(
      axisHorizontalBasicFixture,
      "deceleration",
      "positive",
    );
  });

  it("reproduces ID42 upward vertical source-phase force magnitudes", () => {
    expectHistoricalMagnitude(axisVerticalFixture, "acceleration", "positive");
    expectHistoricalMagnitude(
      axisVerticalFixture,
      "constant-speed",
      "positive",
    );
    expectHistoricalMagnitude(axisVerticalFixture, "deceleration", "positive");
  });
});

describe("resolveAxisLoadPhase", () => {
  it("uses the explicit axis.v1 gravity vector at horizontal and vertical boundaries", () => {
    const horizontal = resolveAxisLoadPhase({
      orientation: "horizontal",
      inclineAngleRad: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.80665,
      frictionCoefficient: 0,
      normalLoadN: 0,
      guideResistanceN: 0,
      travelDirection: "positive",
      axialAccelerationMps2: 0,
    });
    const vertical = resolveAxisLoadPhase({
      orientation: "vertical",
      inclineAngleRad: Math.PI / 2,
      totalMovingMassKg: 10,
      gravityMps2: 9.80665,
      frictionCoefficient: 0,
      normalLoadN: 0,
      guideResistanceN: 0,
      travelDirection: "positive",
      axialAccelerationMps2: 0,
    });

    expect(horizontal.gravityAccelerationMps2).toEqual([0, 0, -9.80665]);
    expect(vertical.gravityAccelerationMps2[0]).toBeCloseTo(-9.80665, 12);
    expect(vertical.gravityAccelerationMps2[2]).toBeCloseTo(0, 12);
  });

  it("resolves centre-of-mass gravity moment and external moment at the carriage reference point", () => {
    const result = resolveAxisLoadPhase({
      orientation: "horizontal",
      inclineAngleRad: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.80665,
      frictionCoefficient: 0,
      normalLoadN: 0,
      guideResistanceN: 0,
      travelDirection: "positive",
      axialAccelerationMps2: 0,
      centerOfMassM: [0, 1, 0],
      externalMomentNm: [1, 2, 3],
    });

    expect(result.gravitationalMomentNm[0]).toBeCloseTo(-98.0665, 12);
    expect(result.resultantAppliedMomentNm[0]).toBeCloseTo(-97.0665, 12);
    expect(result.resultantAppliedMomentNm[1]).toBe(2);
    expect(result.resultantAppliedMomentNm[2]).toBe(3);
  });

  it("reverses running resistance with travel direction and gives stationary holding no friction credit", () => {
    const common = {
      orientation: "horizontal" as const,
      inclineAngleRad: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.8,
      frictionCoefficient: 0.1,
      normalLoadN: 100,
      guideResistanceN: 5,
      axialAccelerationMps2: 0,
    };
    const forward = resolveAxisLoadPhase({
      ...common,
      travelDirection: "positive",
    });
    const reverse = resolveAxisLoadPhase({
      ...common,
      travelDirection: "negative",
    });
    const holding = resolveAxisLoadPhase({
      ...common,
      guideResistanceN: 0,
      travelDirection: "stationary",
    });

    expect(forward.frictionForceN).toEqual([-10, 0, 0]);
    expect(reverse.frictionForceN).toEqual([10, 0, 0]);
    expect(holding.frictionForceN).toEqual([0, 0, 0]);
    expect(holding.requiredAxialDriveForceN).toBe(0);

    const zeroResistance = resolveAxisLoadPhase({
      ...common,
      frictionCoefficient: 0,
      guideResistanceN: 0,
      travelDirection: "positive",
    });
    expect(zeroResistance.frictionForceN).toEqual([0, 0, 0]);
    expect(zeroResistance.guideResistanceForceN).toEqual([0, 0, 0]);
  });

  it("rejects an inconsistent orientation, a malformed vector, and a stationary acceleration", () => {
    const common = {
      orientation: "horizontal" as const,
      inclineAngleRad: 0,
      totalMovingMassKg: 10,
      gravityMps2: 9.8,
      frictionCoefficient: 0,
      normalLoadN: 0,
      guideResistanceN: 0,
      travelDirection: "positive" as const,
      axialAccelerationMps2: 0,
    };

    expect(() =>
      resolveAxisLoadPhase({ ...common, inclineAngleRad: Math.PI / 2 }),
    ).toThrow(AxisLoadPhaseInputError);
    expect(() =>
      resolveAxisLoadPhase({
        ...common,
        externalForceN: [1, 2] as unknown as [number, number, number],
      }),
    ).toThrow(AxisLoadPhaseInputError);
    expect(() =>
      resolveAxisLoadPhase({
        ...common,
        travelDirection: "stationary",
        axialAccelerationMps2: 1,
      }),
    ).toThrow(AxisLoadPhaseInputError);
    expect(() =>
      resolveAxisLoadPhase({
        ...common,
        orientation: "rotary" as AxisLoadPhaseInput["orientation"],
      }),
    ).toThrow(AxisLoadPhaseInputError);
    expect(() =>
      resolveAxisLoadPhase({
        ...common,
        travelDirection: "sideways" as AxisLoadPhaseInput["travelDirection"],
      }),
    ).toThrow(AxisLoadPhaseInputError);
  });
});
