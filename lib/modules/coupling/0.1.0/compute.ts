// Pure, deterministic compute function for the coupling module (v0.1.0
// draft, Stage 3). Resolves the `normal` and `peak` load cases only,
// matching axis-load-cases' and ball-screw's own scope (see ./manifest.ts).
// Reads input magnitudes in their canonical units, delegates the physics to
// the pure kernel in ./math, and returns a structured computation. Performs
// no I/O and imports only the engine's public surface and this module's own
// files.

import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import { makeQuantity } from "@/lib/engine";
import {
  resolveOperatingSpeed,
  resolveScaledRequiredTorque,
  resolveSpeedSafetyFactor,
  resolveTorqueSafetyFactor,
} from "./math";
import { buildChecks, type CouplingCase } from "./checks";
import { buildTrace, type TraceCaseInput } from "./trace";
import { quantityAt } from "./values";

const CASES: readonly CouplingCase[] = ["normal", "peak"];

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const lead = quantityAt(values, "lead");
  // Optional port; the registry's constant default (1, direct-connected)
  // auto-fills an absent value before compute() is ever called
  // (lib/engine/module-sdk/execute.ts resolveModuleInput) — same pattern
  // ball-screw relies on for its own reuse of this parameter.
  const gearRatio = quantityAt(values, "gear_ratio");
  const ratedTorque = quantityAt(values, "rated_torque");
  const maxTorque = quantityAt(values, "max_torque");
  const allowableSpeed = quantityAt(values, "allowable_speed");
  const torsionalStiffness = quantityAt(values, "torsional_stiffness");
  const momentOfInertia = quantityAt(values, "moment_of_inertia");
  const drivingBoreMin = quantityAt(values, "driving_bore_min");
  const drivingBoreMax = quantityAt(values, "driving_bore_max");
  const drivenBoreMin = quantityAt(values, "driven_bore_min");
  const drivenBoreMax = quantityAt(values, "driven_bore_max");
  const allowableParallelMisalignment = quantityAt(
    values,
    "allowable_parallel_misalignment",
  );
  const allowableAngularMisalignment = quantityAt(
    values,
    "allowable_angular_misalignment",
  );
  const allowableAxialMisalignment = quantityAt(
    values,
    "allowable_axial_misalignment",
  );
  const actualParallelMisalignment = quantityAt(
    values,
    "actual_parallel_misalignment",
  );
  const actualAngularMisalignment = quantityAt(
    values,
    "actual_angular_misalignment",
  );
  const actualAxialMisalignment = quantityAt(
    values,
    "actual_axial_misalignment",
  );
  const drivingShaftDiameter = quantityAt(values, "driving_shaft_diameter");
  const drivenShaftDiameter = quantityAt(values, "driven_shaft_diameter");
  const serviceFactor = quantityAt(values, "service_factor");

  if (
    lead === undefined ||
    gearRatio === undefined ||
    ratedTorque === undefined ||
    maxTorque === undefined ||
    allowableSpeed === undefined ||
    torsionalStiffness === undefined ||
    momentOfInertia === undefined ||
    drivingBoreMin === undefined ||
    drivingBoreMax === undefined ||
    drivenBoreMin === undefined ||
    drivenBoreMax === undefined ||
    allowableParallelMisalignment === undefined ||
    allowableAngularMisalignment === undefined ||
    allowableAxialMisalignment === undefined ||
    actualParallelMisalignment === undefined ||
    actualAngularMisalignment === undefined ||
    actualAxialMisalignment === undefined ||
    drivingShaftDiameter === undefined ||
    drivenShaftDiameter === undefined ||
    serviceFactor === undefined
  ) {
    throw new Error(
      "coupling requires its full set of catalog rating, installation, and service-factor inputs.",
    );
  }

  const cases = {} as Record<CouplingCase, TraceCaseInput>;
  for (const loadCase of CASES) {
    const driveTorque = quantityAt(values, `${loadCase}_drive_torque`);
    const linearVelocity = quantityAt(values, `${loadCase}_linear_velocity`);
    if (driveTorque === undefined || linearVelocity === undefined) {
      throw new Error(
        `coupling requires drive torque and linear velocity for the "${loadCase}" case.`,
      );
    }

    const { rotationalSpeedRadPerS } = resolveOperatingSpeed({
      linearVelocityMps: linearVelocity.value,
      leadM: lead.value,
      gearRatio: gearRatio.value,
    });

    const { scaledRequiredTorqueNm } = resolveScaledRequiredTorque({
      requiredTorqueNm: driveTorque.value,
      serviceFactor: serviceFactor.value,
    });

    const capacityTorqueNm =
      loadCase === "normal" ? ratedTorque.value : maxTorque.value;
    const { torqueSafetyFactor } = resolveTorqueSafetyFactor({
      capacityTorqueNm,
      scaledRequiredTorqueNm,
    });

    const { speedSafetyFactor } = resolveSpeedSafetyFactor({
      allowableSpeedRadPerS: allowableSpeed.value,
      operatingSpeedRadPerS: rotationalSpeedRadPerS,
    });

    cases[loadCase] = {
      driveTorque,
      linearVelocity,
      rotationalSpeedRadPerS,
      scaledRequiredTorqueNm,
      capacityTorqueNm,
      torqueSafetyFactor,
      speedSafetyFactor,
    };
  }

  const outputs: Record<string, Quantity> = {};
  for (const loadCase of CASES) {
    outputs[`${loadCase}_torque_safety_factor`] = makeQuantity(
      cases[loadCase].torqueSafetyFactor,
      "ratio",
    );
    outputs[`${loadCase}_speed_safety_factor`] = makeQuantity(
      cases[loadCase].speedSafetyFactor,
      "ratio",
    );
  }

  return {
    outputs,
    trace: buildTrace({
      lead,
      gearRatio,
      ratedTorque,
      maxTorque,
      allowableSpeed,
      torsionalStiffness,
      momentOfInertia,
      drivingBoreMin,
      drivingBoreMax,
      drivenBoreMin,
      drivenBoreMax,
      allowableParallelMisalignment,
      allowableAngularMisalignment,
      allowableAxialMisalignment,
      actualParallelMisalignment,
      actualAngularMisalignment,
      actualAxialMisalignment,
      drivingShaftDiameter,
      drivenShaftDiameter,
      serviceFactor,
      cases,
    }),
    checks: buildChecks({
      drivingBoreMin,
      drivingBoreMax,
      drivenBoreMin,
      drivenBoreMax,
      drivingShaftDiameter,
      drivenShaftDiameter,
      allowableParallelMisalignment,
      allowableAngularMisalignment,
      allowableAxialMisalignment,
      actualParallelMisalignment,
      actualAngularMisalignment,
      actualAxialMisalignment,
      cases: {
        normal: {
          torqueSafetyFactor: cases.normal.torqueSafetyFactor,
          speedSafetyFactor: cases.normal.speedSafetyFactor,
        },
        peak: {
          torqueSafetyFactor: cases.peak.torqueSafetyFactor,
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
        id: "peak-case-torque-concept-adapted",
        statement:
          "The peak case is checked against the coupling's own maximum (shock) torque rating, reusing screw.drive_torque[peak] as the required torque — a documented adaptation, since axis-load-cases' own \"peak\" case means a peak operating condition, not the motor starting-torque transient KTR's and R+W's own sources mean by that term (context/modules/coupling/stage-2-contract.md 'Decisions' item 4).",
      },
      {
        id: "service-factor-supplied",
        statement:
          "The service factor is engineer-supplied (coupling.service_factor), not a built-in constant: KTR and R+W each publish their own disagreeing operating/temperature/starting/direction factor tables, and neither is adopted wholesale (context/modules/coupling/stage-2-contract.md 'Decisions' item 5). Applied identically to both the normal and peak cases.",
        value: serviceFactor,
      },
      {
        id: "operating-speed-derived-locally",
        statement:
          "Operating rotational speed is derived from motion.axis.case_linear_velocity via screw.lead and screw.gear_ratio, not a released screw.* speed port (context/modules/coupling/stage-2-contract.md 'Decisions' item 1).",
      },
    ],
    validity: [],
  };
}
