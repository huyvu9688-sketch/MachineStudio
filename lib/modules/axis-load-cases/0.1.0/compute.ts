// Pure, deterministic compute function for the axis-load-cases module
// (v0.1.0 draft, Stage 3). Resolves the `normal` and `peak` load cases only
// — `holding` and `emergency_stop` are deferred to a future version (see
// ./manifest.ts). Reads input magnitudes in their canonical units, delegates
// the physics to the pure `axis.v1` kernel in ./math (the same kernel the
// Stage 2 historical-fixture regression tests exercise), and returns a
// structured computation. Performs no I/O and imports only the engine's
// public surface and this module's own files.

import type { ModuleComputation, ModuleInput } from "@/lib/engine";
import { makeQuantity } from "@/lib/engine";
import {
  resolveAxisLoadPhase,
  type AxisLoadPhaseResult,
  type AxisOrientation,
  type TravelDirection,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace, type TraceCaseInput } from "./trace";
import { axisComponents, enumAt, quantityAt, vectorAt } from "./values";

const MOVING_CASES = ["normal", "peak"] as const;
type MovingCase = (typeof MOVING_CASES)[number];

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const orientation = enumAt(values, "orientation")?.value as
    AxisOrientation | undefined;
  const inclineAngle = quantityAt(values, "incline_angle");
  const gravity = quantityAt(values, "gravity");
  if (
    orientation === undefined ||
    inclineAngle === undefined ||
    gravity === undefined
  ) {
    throw new Error(
      'axis-load-cases requires "orientation", "incline_angle", and "gravity".',
    );
  }

  const totalMovingMassInput = quantityAt(values, "total_moving_mass");
  const payloadMass = quantityAt(values, "payload_mass");
  const carriageMass = quantityAt(values, "carriage_mass");
  const additionalMass = quantityAt(values, "additional_moving_mass");

  // ./input-schema.ts guarantees exactly one mass route reaches compute():
  // total_moving_mass, or the payload_mass + carriage_mass breakdown.
  const massRoute: "total" | "breakdown" =
    totalMovingMassInput !== undefined ? "total" : "breakdown";
  const totalMovingMassKg =
    totalMovingMassInput?.value ??
    (payloadMass?.value ?? 0) +
      (carriageMass?.value ?? 0) +
      (additionalMass?.value ?? 0);

  const frictionCoefficient =
    quantityAt(values, "friction_coefficient")?.value ?? 0;
  const centerOfMassOffset = vectorAt(values, "center_of_mass_offset");
  const centerOfMass = axisComponents(centerOfMassOffset);

  // The Coulomb-friction normal load is the gravity component perpendicular
  // to the axis of travel (context/modules/axis-load-cases/stage-1-spec.md
  // candidate method; matches the historical-fixture regression tests in
  // ./axis-load-cases.test.ts).
  const normalLoadN =
    totalMovingMassKg * gravity.value * Math.cos(inclineAngle.value);

  const cases = {} as Record<MovingCase, TraceCaseInput>;
  for (const loadCase of MOVING_CASES) {
    const travelDirection = enumAt(values, `${loadCase}_travel_direction`)
      ?.value as TravelDirection | undefined;
    const axialAcceleration = quantityAt(
      values,
      `${loadCase}_axial_acceleration`,
    );
    const guideResistance = quantityAt(
      values,
      `${loadCase}_guide_resistance_force`,
    );
    if (
      travelDirection === undefined ||
      axialAcceleration === undefined ||
      guideResistance === undefined
    ) {
      throw new Error(
        `axis-load-cases requires travel direction, axial acceleration, and guide resistance for the "${loadCase}" case.`,
      );
    }
    const externalForce = vectorAt(values, `${loadCase}_external_force`);
    const externalMoment = vectorAt(values, `${loadCase}_external_moment`);

    const result: AxisLoadPhaseResult = resolveAxisLoadPhase({
      orientation,
      inclineAngleRad: inclineAngle.value,
      totalMovingMassKg,
      gravityMps2: gravity.value,
      frictionCoefficient,
      normalLoadN,
      guideResistanceN: guideResistance.value,
      travelDirection,
      axialAccelerationMps2: axialAcceleration.value,
      externalForceN: axisComponents(externalForce),
      externalMomentNm: axisComponents(externalMoment),
      centerOfMassM: centerOfMass,
    });

    cases[loadCase] = {
      loadCase,
      travelDirection,
      axialAcceleration,
      guideResistance,
      externalForce,
      externalMoment,
      result,
    };
  }

  const totalMovingMassOut = makeQuantity(totalMovingMassKg, "kg");
  // Gravity's axial-frame resolution depends only on orientation, incline,
  // mass, and gravity — identical for both cases — so either case's kernel
  // result reports it.
  const gravitationalForceOut = makeQuantity(
    cases.normal.result.gravitationalForceN[0],
    "N",
  );
  const normalThrustOut = makeQuantity(
    cases.normal.result.requiredAxialDriveForceN,
    "N",
  );
  const peakThrustOut = makeQuantity(
    cases.peak.result.requiredAxialDriveForceN,
    "N",
  );

  return {
    outputs: {
      total_moving_mass: totalMovingMassOut,
      gravitational_force: gravitationalForceOut,
      normal_thrust_force: normalThrustOut,
      peak_thrust_force: peakThrustOut,
    },
    trace: buildTrace({
      orientation,
      inclineAngle,
      gravity,
      massRoute,
      totalMovingMass: totalMovingMassOut,
      payloadMass,
      carriageMass,
      additionalMass,
      frictionCoefficient,
      normalLoadN,
      centerOfMassOffset,
      gravitationalForce: gravitationalForceOut,
      cases,
    }),
    checks: buildChecks({
      inclineAngle,
      frictionCoefficient,
      totalMovingMass: totalMovingMassOut,
    }),
    warnings: [],
    assumptions: [
      {
        id: "scope-normal-peak-only",
        statement:
          "This module version (0.1.0) resolves only the normal and peak load cases. Holding and emergency-stop support is deferred to a future version pending sanitized evidence of a holding/brake case and an emergency-stop deceleration/process-force case.",
      },
      {
        id: "normal-load-gravity-component",
        statement:
          "The Coulomb-friction normal load is taken as the gravity component perpendicular to the axis of travel (total moving mass x gravity x cos(incline angle)); no additional normal-load contribution (e.g. from an external force) is modeled in this version.",
      },
    ],
    validity: [
      {
        id: "incline-angle-envelope",
        status:
          inclineAngle.value >= 0 && inclineAngle.value <= Math.PI / 2
            ? "within_limits"
            : "out_of_range",
        limit:
          "0 <= incline angle <= 90 degrees (horizontal to vertical), single rigid moving assembly",
        observed: inclineAngle,
      },
    ],
  };
}
