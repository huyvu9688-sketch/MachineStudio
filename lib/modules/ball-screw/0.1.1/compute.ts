// Pure, deterministic compute function for the ball-screw module (v0.1.0
// draft, Stage 3). Resolves the `normal` and `peak` load cases only,
// matching axis-load-cases' own scope (see ./manifest.ts). Reads input
// magnitudes in their canonical units, delegates the physics to the pure
// kernel in ./math (the same kernel math.test.ts exercises against Rockford
// Ball Screw's published worked example), and returns a structured
// computation. Performs no I/O and imports only the engine's public surface
// and this module's own files.
//
// The buckling safety margin and the critical-speed operating margin are
// treated differently on purpose: the critical-speed margin (0.8) is not
// contested by any source this project found, so the kernel's own constant
// is used as-is. The buckling margin IS contested (Steinmeyer 0.5 vs.
// Rockford 0.8), so this compute function ignores the kernel's own baked-in
// 0.5 and recomputes the permissible load from the registry-supplied
// screw.buckling_safety_margin input instead — context/modules/ball-screw/
// stage-2-contract.md "Decisions" item 2.

import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import { convert, makeQuantity } from "@/lib/engine";
import {
  resolveRotationalSpeed,
  resolveDriveTorque,
  resolveEquivalentDynamicLoad,
  resolveNominalLife,
  resolveLifeHours,
  resolveBucklingLoad,
  resolveCriticalSpeed,
  resolveStaticSafetyFactor,
  type ScrewEndSupportArrangement,
} from "./math";
import { buildChecks, type BallScrewCase } from "./checks";
import { buildTrace, type TraceCaseInput } from "./trace";
import { enumValueAt, quantityAt } from "./values";

const CASES: readonly BallScrewCase[] = ["normal", "peak"];

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const minorDiameter = quantityAt(values, "minor_diameter");
  const lead = quantityAt(values, "lead");
  const unsupportedLength = quantityAt(values, "unsupported_length");
  const endSupportArrangement = enumValueAt(
    values,
    "end_support_arrangement",
  ) as ScrewEndSupportArrangement | undefined;
  const dynamicLoadRating = quantityAt(values, "dynamic_load_rating");
  const staticLoadRating = quantityAt(values, "static_load_rating");
  const preload = quantityAt(values, "preload");
  const internalFrictionCoefficient = quantityAt(
    values,
    "internal_friction_coefficient",
  );
  const mechanicalEfficiency = quantityAt(values, "mechanical_efficiency");
  // Optional port; the registry's constant default (1, direct-connected)
  // auto-fills an absent value before compute() is ever called
  // (lib/engine/module-sdk/execute.ts resolveModuleInput) — same pattern
  // axis-load-cases relies on for its own "gravity" port.
  const gearRatio = quantityAt(values, "gear_ratio");
  const staticSafetyFactorMinimum = quantityAt(
    values,
    "static_safety_factor_minimum",
  );
  const bucklingSafetyMargin = quantityAt(values, "buckling_safety_margin");
  const manufacturerSpeedLimit = quantityAt(values, "manufacturer_speed_limit");

  if (
    minorDiameter === undefined ||
    lead === undefined ||
    unsupportedLength === undefined ||
    endSupportArrangement === undefined ||
    dynamicLoadRating === undefined ||
    staticLoadRating === undefined ||
    preload === undefined ||
    internalFrictionCoefficient === undefined ||
    mechanicalEfficiency === undefined ||
    gearRatio === undefined ||
    staticSafetyFactorMinimum === undefined ||
    bucklingSafetyMargin === undefined
  ) {
    throw new Error(
      "ball-screw requires its full set of screw geometry, rating, and safety-margin inputs.",
    );
  }

  const cases = {} as Record<BallScrewCase, TraceCaseInput>;
  for (const loadCase of CASES) {
    const thrustForce = quantityAt(values, `${loadCase}_thrust_force`);
    const timeFraction = quantityAt(values, `${loadCase}_time_fraction`);
    const linearVelocity = quantityAt(values, `${loadCase}_linear_velocity`);
    if (
      thrustForce === undefined ||
      timeFraction === undefined ||
      linearVelocity === undefined
    ) {
      throw new Error(
        `ball-screw requires thrust force, time fraction, and linear velocity for the "${loadCase}" case.`,
      );
    }

    const { rotationalSpeedRevPerMin } = resolveRotationalSpeed({
      linearVelocityMps: linearVelocity.value,
      leadM: lead.value,
    });

    const { loadTorqueNm } = resolveDriveTorque({
      axialForceN: thrustForce.value,
      leadM: lead.value,
      efficiency: mechanicalEfficiency.value,
      preloadN: preload.value,
      internalFrictionCoefficient: internalFrictionCoefficient.value,
      gearRatio: gearRatio.value,
    });

    const { staticSafetyFactor } = resolveStaticSafetyFactor({
      staticLoadRatingN: staticLoadRating.value,
      appliedLoadN: Math.abs(thrustForce.value),
    });

    cases[loadCase] = {
      thrustForce,
      timeFraction,
      linearVelocity,
      rotationalSpeedRevPerMin,
      driveTorqueNm: loadTorqueNm,
      staticSafetyFactor,
    };
  }

  const { equivalentLoadN, meanRotationalSpeedRevPerMin } =
    resolveEquivalentDynamicLoad(
      CASES.map((loadCase) => ({
        timeFraction: cases[loadCase].timeFraction.value,
        rotationalSpeedRevPerMin: cases[loadCase].rotationalSpeedRevPerMin,
        axialLoadMagnitudeN: Math.abs(cases[loadCase].thrustForce.value),
      })),
    );

  const { lifeRevolutions } = resolveNominalLife({
    dynamicLoadRatingN: dynamicLoadRating.value,
    equivalentLoadN,
  });
  const { lifeHours } = resolveLifeHours({
    lifeRevolutions,
    meanRotationalSpeedRevPerMin,
  });

  const { bucklingLoadN } = resolveBucklingLoad({
    rootDiameterM: minorDiameter.value,
    unsupportedLengthM: unsupportedLength.value,
    endSupportArrangement,
  });
  // Ignores the kernel's own baked-in 0.5 permissibleCompressiveLoadN — see
  // this file's top comment.
  const permissibleCompressiveLoadN =
    bucklingLoadN * bucklingSafetyMargin.value;

  const { criticalSpeedRevPerMin, permissibleSpeedRevPerMin } =
    resolveCriticalSpeed({
      rootDiameterM: minorDiameter.value,
      unsupportedLengthM: unsupportedLength.value,
      endSupportArrangement,
    });

  const outputs: Record<string, Quantity> = {
    equivalent_dynamic_load: makeQuantity(equivalentLoadN, "N"),
    mean_rotational_speed: makeQuantity(
      convert(meanRotationalSpeedRevPerMin, "rpm", "rad/s"),
      "rad/s",
    ),
    nominal_life: makeQuantity(lifeRevolutions, "rev"),
    nominal_life_hours: makeQuantity(convert(lifeHours, "h", "s"), "s"),
    buckling_load: makeQuantity(bucklingLoadN, "N"),
    permissible_compressive_load: makeQuantity(
      permissibleCompressiveLoadN,
      "N",
    ),
    critical_speed: makeQuantity(
      convert(criticalSpeedRevPerMin, "rpm", "rad/s"),
      "rad/s",
    ),
    permissible_speed: makeQuantity(
      convert(permissibleSpeedRevPerMin, "rpm", "rad/s"),
      "rad/s",
    ),
  };
  for (const loadCase of CASES) {
    outputs[`${loadCase}_drive_torque`] = makeQuantity(
      cases[loadCase].driveTorqueNm,
      "N*m",
    );
    outputs[`${loadCase}_static_safety_factor`] = makeQuantity(
      cases[loadCase].staticSafetyFactor,
      "ratio",
    );
  }

  return {
    outputs,
    trace: buildTrace({
      minorDiameter,
      lead,
      unsupportedLength,
      endSupportArrangement,
      dynamicLoadRating,
      staticLoadRating,
      preload,
      internalFrictionCoefficient,
      mechanicalEfficiency,
      gearRatio,
      staticSafetyFactorMinimum,
      bucklingSafetyMargin,
      cases,
      equivalentLoadN,
      meanRotationalSpeedRevPerMin,
      lifeRevolutions,
      lifeHours,
      bucklingLoadN,
      permissibleCompressiveLoadN,
      criticalSpeedRevPerMin,
      permissibleSpeedRevPerMin,
    }),
    checks: buildChecks({
      minorDiameter,
      lead,
      unsupportedLength,
      staticSafetyFactorMinimum,
      bucklingSafetyMargin,
      permissibleCompressiveLoadN,
      permissibleSpeedRevPerMin,
      manufacturerSpeedLimit,
      cases: {
        normal: {
          appliedLoadMagnitudeN: Math.abs(cases.normal.thrustForce.value),
          staticSafetyFactor: cases.normal.staticSafetyFactor,
          rotationalSpeedRevPerMin: cases.normal.rotationalSpeedRevPerMin,
        },
        peak: {
          appliedLoadMagnitudeN: Math.abs(cases.peak.thrustForce.value),
          staticSafetyFactor: cases.peak.staticSafetyFactor,
          rotationalSpeedRevPerMin: cases.peak.rotationalSpeedRevPerMin,
        },
      },
    }),
    warnings: [],
    assumptions: [
      {
        id: "scope-normal-peak-only",
        statement:
          "This module version (0.1.0) resolves only the normal and peak load cases, matching axis-load-cases' own 0.1.0 scope. Holding and emergency_stop support is deferred pending a supported upstream thrust force for those cases.",
      },
      {
        id: "buckling-safety-margin-supplied",
        statement:
          "The buckling permissible-load safety margin is engineer-supplied (screw.buckling_safety_margin), not a built-in constant: Steinmeyer states 0.5, Rockford Ball Screw's own worked example uses 0.8 for the identical formula, and neither source is definitively authoritative.",
        value: bucklingSafetyMargin,
      },
      {
        id: "static-safety-factor-minimum-supplied",
        statement:
          "The minimum required static safety factor is engineer-supplied (screw.static_safety_factor_minimum), not a built-in constant: published guidance (e.g. MITcalc) varies by machine type and vibration/impact condition.",
        value: staticSafetyFactorMinimum,
      },
    ],
    validity: [],
  };
}
