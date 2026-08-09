// Pure, deterministic compute function for the support-bearing module
// (v0.1.0 draft, Stage 3). Resolves the `normal` and `peak` load cases
// only, matching axis-load-cases' and ball-screw's own scope (see
// ./manifest.ts). Reads input magnitudes in their canonical units,
// delegates the physics to the pure kernel in ./math, and returns a
// structured computation. Performs no I/O and imports only the engine's
// public surface and this module's own files.

import { convert, makeQuantity } from "@/lib/engine";
import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import {
  resolveDynamicEquivalentLoad,
  resolveLifeHours,
  resolveNominalLife,
  resolveOperatingSpeed,
  resolveSpeedSafetyFactor,
  resolveStaticEquivalentLoad,
  resolveStaticSafetyFactor,
} from "./math";
import { buildChecks, type SupportBearingCase } from "./checks";
import { buildTrace, type TraceCaseInput } from "./trace";
import { enumValueAt, quantityAt } from "./values";

const CASES: readonly SupportBearingCase[] = ["normal", "peak"];

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const location = enumValueAt(values, "location");
  const lead = quantityAt(values, "lead");
  const dynamicLoadRating = quantityAt(values, "dynamic_load_rating");
  const staticLoadRating = quantityAt(values, "static_load_rating");
  const allowableSpeed = quantityAt(values, "allowable_speed");
  const dynamicLoadFactorX = quantityAt(values, "dynamic_load_factor_x");
  const dynamicLoadFactorY = quantityAt(values, "dynamic_load_factor_y");
  const staticLoadFactorX = quantityAt(values, "static_load_factor_x");
  const staticLoadFactorY = quantityAt(values, "static_load_factor_y");
  const boreDiameter = quantityAt(values, "bore_diameter");
  const outsideDiameter = quantityAt(values, "outside_diameter");
  const preload = quantityAt(values, "preload");
  const staticSafetyFactorMinimum = quantityAt(
    values,
    "static_safety_factor_minimum",
  );

  if (
    (location !== "fixed" && location !== "supported") ||
    lead === undefined ||
    dynamicLoadRating === undefined ||
    staticLoadRating === undefined ||
    allowableSpeed === undefined ||
    dynamicLoadFactorX === undefined ||
    staticLoadFactorX === undefined ||
    boreDiameter === undefined ||
    outsideDiameter === undefined ||
    staticSafetyFactorMinimum === undefined
  ) {
    throw new Error(
      "support-bearing requires its full set of catalog rating and installation inputs, and a valid bearing.location.",
    );
  }

  const isFixed = location === "fixed";
  if (
    isFixed &&
    (dynamicLoadFactorY === undefined || staticLoadFactorY === undefined)
  ) {
    // input-schema.ts already rejects this combination before compute() is
    // ever called; this is a defense-in-depth guard, not the primary check.
    throw new Error(
      'support-bearing requires dynamic_load_factor_y and static_load_factor_y when location is "fixed".',
    );
  }

  const cases = {} as Record<SupportBearingCase, TraceCaseInput>;
  for (const loadCase of CASES) {
    const actualRadialLoad = quantityAt(
      values,
      `${loadCase}_actual_radial_load`,
    );
    const linearVelocity = quantityAt(values, `${loadCase}_linear_velocity`);
    if (actualRadialLoad === undefined || linearVelocity === undefined) {
      throw new Error(
        `support-bearing requires actual radial load and linear velocity for the "${loadCase}" case.`,
      );
    }

    const thrustForce = quantityAt(values, `${loadCase}_thrust_force`);
    if (isFixed && thrustForce === undefined) {
      // input-schema.ts already rejects this; defense-in-depth guard.
      throw new Error(
        `support-bearing requires thrust force for the "${loadCase}" case when location is "fixed".`,
      );
    }
    const axialLoadN = isFixed ? Math.abs(thrustForce!.value) : 0;

    const { rotationalSpeedRevPerMin, rotationalSpeedRadPerS } =
      resolveOperatingSpeed({
        linearVelocityMps: linearVelocity.value,
        leadM: lead.value,
      });

    const { dynamicEquivalentLoadN } = resolveDynamicEquivalentLoad({
      radialLoadN: actualRadialLoad.value,
      axialLoadN,
      factorX: dynamicLoadFactorX.value,
      factorY: isFixed ? dynamicLoadFactorY!.value : 0,
    });

    const { staticEquivalentLoadN } = resolveStaticEquivalentLoad({
      radialLoadN: actualRadialLoad.value,
      axialLoadN,
      factorX0: staticLoadFactorX.value,
      factorY0: isFixed ? staticLoadFactorY!.value : 0,
    });

    const { lifeRevolutions } = resolveNominalLife({
      dynamicLoadRatingN: dynamicLoadRating.value,
      equivalentLoadN: dynamicEquivalentLoadN,
    });

    const { lifeHours } = resolveLifeHours({
      lifeRevolutions,
      rotationalSpeedRevPerMin,
    });

    const { staticSafetyFactor } = resolveStaticSafetyFactor({
      staticLoadRatingN: staticLoadRating.value,
      staticEquivalentLoadN,
    });

    const { speedSafetyFactor } = resolveSpeedSafetyFactor({
      allowableSpeedRadPerS: allowableSpeed.value,
      operatingSpeedRadPerS: rotationalSpeedRadPerS,
    });

    cases[loadCase] = {
      actualRadialLoad,
      thrustForce,
      linearVelocity,
      axialLoadN,
      rotationalSpeedRadPerS,
      dynamicEquivalentLoadN,
      staticEquivalentLoadN,
      lifeRevolutions,
      lifeHours,
      staticSafetyFactor,
      speedSafetyFactor,
    };
  }

  const outputs: Record<string, Quantity> = {};
  for (const loadCase of CASES) {
    const c = cases[loadCase];
    outputs[`${loadCase}_dynamic_equivalent_load`] = makeQuantity(
      c.dynamicEquivalentLoadN,
      "N",
    );
    outputs[`${loadCase}_nominal_life`] = makeQuantity(
      c.lifeRevolutions,
      "rev",
    );
    outputs[`${loadCase}_nominal_life_hours`] = makeQuantity(
      convert(c.lifeHours, "h", "s"),
      "s",
    );
    outputs[`${loadCase}_static_safety_factor`] = makeQuantity(
      c.staticSafetyFactor,
      "ratio",
    );
    outputs[`${loadCase}_speed_safety_factor`] = makeQuantity(
      c.speedSafetyFactor,
      "ratio",
    );
  }

  return {
    outputs,
    trace: buildTrace({
      location,
      lead,
      dynamicLoadRating,
      staticLoadRating,
      allowableSpeed,
      dynamicLoadFactorX,
      dynamicLoadFactorY,
      staticLoadFactorX,
      staticLoadFactorY,
      boreDiameter,
      outsideDiameter,
      preload,
      staticSafetyFactorMinimum,
      cases,
    }),
    checks: buildChecks({
      staticSafetyFactorMinimum,
      cases: {
        normal: {
          staticSafetyFactor: cases.normal.staticSafetyFactor,
          speedSafetyFactor: cases.normal.speedSafetyFactor,
        },
        peak: {
          staticSafetyFactor: cases.peak.staticSafetyFactor,
          speedSafetyFactor: cases.peak.speedSafetyFactor,
        },
      },
    }),
    warnings: [],
    assumptions: [
      {
        id: "scope-normal-peak-only",
        statement:
          "This module version (0.1.0) resolves only the normal and peak load cases, matching axis-load-cases' and ball-screw's own 0.1.0 scope.",
      },
      {
        id: "location-selects-checks",
        statement: `This calculation represents the ${location}-side support bearing (bearing.location). ${isFixed ? "Axial load (motion.axis.thrust_force) is consumed and both dynamic/static Y factors apply." : "No axial load is consumed — the supported/floating-side bearing does not react axial thrust in THK's own Support Unit design (context/modules/support-bearing/stage-1-spec.md 'Candidate Sources')."}`,
      },
      {
        id: "speed-correction-not-implemented",
        statement:
          "The catalog allowable speed is used uncorrected. NTN's own speed correction factors (fL by load, fC by combined radial/axial load) are printed only as graphs, not closed-form equations, and are not implemented in 0.1.0 (context/modules/support-bearing/stage-1-spec.md item 5).",
      },
      {
        id: "bore-outside-diameter-reported",
        statement:
          "bearing.bore_diameter and bearing.outside_diameter are reported catalog values, not evaluated against an actual shaft/housing diameter — a support bearing's bore is manufactured to one matched shaft diameter, not a clamping range (context/modules/support-bearing/stage-2-contract.md 'Decisions').",
      },
    ],
    validity: [],
  };
}
