// Pure, deterministic compute function for the dual-rod-cylinder-sizing
// module (v0.1.0, Stage 3). Resolves required extend/retract force and
// required cushion kinetic energy, echoes catalog-relevant resolved
// inputs as outputs (see ./manifest.ts's own top comment for why), and
// returns a structured computation. Performs no I/O and imports only the
// engine's public surface and this module's own files.
//
// Does NOT call resolveAllowableLoadMass: the load-mass-vs-overhang-length
// check needs a specific candidate's own bore/bearing-type, which does not
// exist at this module's own run level -- it runs per-candidate in
// lib/application/catalogs/dual-rod-cylinder-matching.ts instead, the
// same treatment guided-cylinder-sizing@0.1.0's own compute() already
// gives resolveBucklingLoad.

import {
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type ModuleComputation,
  type ModuleInput,
} from "@/lib/engine";
import {
  resolveCushionKineticEnergy,
  resolveRequiredForce,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { enumValueAt, quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const inclineAngle = quantityAt(values, "incline_angle");
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
  const loadMass = quantityAt(values, "load_mass");
  const processForce = quantityAt(values, "process_force");
  const operatingPressure = quantityAt(values, "operating_pressure");
  const loadFactor = quantityAt(values, "load_factor");
  const maxPistonSpeed = quantityAt(values, "max_piston_speed");
  const cushionType = enumValueAt(values, "cushion_type");
  const requiredStroke = quantityAt(values, "required_stroke");
  const overhangLength = quantityAt(values, "overhang_length");
  const mountingOrientation = enumValueAt(values, "mounting_orientation");

  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    loadMass === undefined ||
    operatingPressure === undefined ||
    loadFactor === undefined ||
    maxPistonSpeed === undefined ||
    cushionType === undefined ||
    requiredStroke === undefined ||
    overhangLength === undefined ||
    mountingOrientation === undefined
  ) {
    throw new Error(
      "dual-rod-cylinder-sizing requires its full set of load, pressure, load-factor, speed, cushion-type, stroke, overhang-length, and mounting-orientation inputs.",
    );
  }

  // process_force is optional at the port level; the registry's own
  // constant default (0 N) auto-fills an absent value
  // (lib/engine/module-sdk/execute.ts resolveModuleInput) -- resolved here
  // defensively in case a caller executes compute() directly with a
  // partially-resolved input.
  const resolvedProcessForce = processForce ?? makeQuantity(0, "N");

  const { forceN: requiredExtendForceN } = resolveRequiredForce({
    processForceN: resolvedProcessForce.value,
    loadMassKg: loadMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "extend",
  });
  const { forceN: requiredRetractForceN } = resolveRequiredForce({
    processForceN: resolvedProcessForce.value,
    loadMassKg: loadMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "retract",
  });

  const { kineticEnergyJ } = resolveCushionKineticEnergy({
    loadMassKg: loadMass.value,
    maxPistonSpeedMps: maxPistonSpeed.value,
  });

  const outputs: Record<string, EngineeringValue> = {
    required_extend_force: makeQuantity(requiredExtendForceN, "N"),
    required_retract_force: makeQuantity(requiredRetractForceN, "N"),
    kinetic_energy: makeQuantity(kineticEnergyJ, "J"),
    required_stroke_out: requiredStroke,
    overhang_length_out: overhangLength,
    mounting_orientation_out: makeEnumOutput(
      "dual_rod_mounting_orientation",
      mountingOrientation,
    ),
    operating_pressure_out: operatingPressure,
    load_factor_out: loadFactor,
    max_piston_speed_out: maxPistonSpeed,
    cushion_type_out: makeEnumOutput("pneumatic_cushion_type", cushionType),
    load_mass_out: loadMass,
  };

  return {
    outputs,
    trace: buildTrace({
      processForce: resolvedProcessForce,
      loadMass,
      inclineAngle,
      frictionCoefficient,
      requiredExtendForceN,
      requiredRetractForceN,
      maxPistonSpeed,
      kineticEnergyJ,
      requiredStroke,
      overhangLength,
      mountingOrientation,
      operatingPressure,
      loadFactor,
      cushionType,
    }),
    checks: buildChecks(),
    warnings: [],
    assumptions: [
      {
        id: "no-per-candidate-check-in-this-run",
        statement:
          "This run computes a required specification for catalog matching; it does not check one specific candidate cylinder. Force capacity, cushion energy, and the load-mass-vs-overhang-length structural check against a real catalog candidate are evaluated by lib/application/catalogs/dual-rod-cylinder-matching.ts once catalog candidates exist.",
      },
      {
        id: "process-force-extend-only",
        statement:
          "The optional process force is applied on the extend stroke only, a disclosed 0.1.0 simplification (context/modules/dual-rod-cylinder-sizing/stage-2-contract.md Decision 3).",
        value: resolvedProcessForce,
      },
      {
        id: "retract-force-may-be-negative",
        statement:
          "Required retract force may be negative for a strongly gravity-assisted return stroke on a heavy unbalanced load, meaning the actuator must resist/brake rather than drive. Reported as computed, not floored.",
      },
      {
        id: "no-buckling-check-disclosed-scope-difference",
        statement:
          "Unlike pneumatic-cylinder-sizing@0.1.0 and guided-cylinder-sizing@0.1.0, this module has no Euler column buckling check. SMC's own CXS2 catalog gives no buckling formula, and this mechanism's own governing structural check is SMC's own directly-published load-mass-vs-overhang-length rating instead (stage-1-spec.md 'No buckling check for this family') -- a disclosed scope difference, not a gap.",
      },
      {
        id: "cushion-energy-reported-only",
        statement:
          "Required cushion kinetic energy is reported, not checked against a candidate: CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized -- a disclosed 0.1.0 evidence gap.",
      },
      {
        id: "load-mass-vs-overhang-band-selection-is-a-judgment-call",
        statement:
          "The load-mass-vs-overhang-length check (evaluated per-candidate, not by this run) selects the narrowest seeded stroke/speed band covering this run's own real required_stroke/max_piston_speed, rounding up rather than gating on a fixed worst-case band -- a founder-directed engineering judgment call (context/modules/dual-rod-cylinder-sizing/stage-2-contract.md Decision 6), not a rule SMC's own catalog states directly.",
      },
      {
        id: "no-load-case-semantics",
        statement:
          "No load case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per calculation run.",
      },
    ],
    validity: [],
  };
}

function makeEnumOutput(enumId: string, value: string): EnumValue {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "enum",
    enumId,
    value,
  };
}
