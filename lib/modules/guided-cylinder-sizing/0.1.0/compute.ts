// Pure, deterministic compute function for the guided-cylinder-sizing
// module (v0.1.0, Stage 3). Resolves required extend/retract force and
// required resultant moment, echoes catalog-relevant resolved inputs as
// outputs (see ./manifest.ts's own top comment for why), and returns a
// structured computation. Performs no I/O and imports only the engine's
// public surface and this module's own files.

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
  resolveRequiredMoment,
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
  const mountingStyle = enumValueAt(values, "mounting_style");
  const bucklingSafetyFactor = quantityAt(values, "buckling_safety_factor");
  const rollOffset = quantityAt(values, "roll_offset");
  const pitchOffset = quantityAt(values, "pitch_offset");
  const yawOffset = quantityAt(values, "yaw_offset");

  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    loadMass === undefined ||
    operatingPressure === undefined ||
    loadFactor === undefined ||
    maxPistonSpeed === undefined ||
    cushionType === undefined ||
    requiredStroke === undefined ||
    mountingStyle === undefined ||
    bucklingSafetyFactor === undefined ||
    rollOffset === undefined ||
    pitchOffset === undefined ||
    yawOffset === undefined
  ) {
    throw new Error(
      "guided-cylinder-sizing requires its full set of load, pressure, load-factor, speed, cushion-type, stroke, mounting-style, buckling-safety-factor, and roll/pitch/yaw-offset inputs.",
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

  const {
    rollMomentNm,
    pitchMomentNm,
    yawMomentNm,
    requiredMomentNm,
  } = resolveRequiredMoment({
    lateralForceN: Math.max(0, requiredExtendForceN),
    rollOffsetMm: rollOffset.value,
    pitchOffsetMm: pitchOffset.value,
    yawOffsetMm: yawOffset.value,
  });

  const outputs: Record<string, EngineeringValue> = {
    required_extend_force: makeQuantity(requiredExtendForceN, "N"),
    required_retract_force: makeQuantity(requiredRetractForceN, "N"),
    required_moment: makeQuantity(requiredMomentNm, "N*m"),
    kinetic_energy: makeQuantity(kineticEnergyJ, "J"),
    required_stroke_out: requiredStroke,
    operating_pressure_out: operatingPressure,
    load_factor_out: loadFactor,
    buckling_safety_factor_out: bucklingSafetyFactor,
    mounting_style_out: makeEnumOutput("pneumatic_mounting_style", mountingStyle),
    cushion_type_out: makeEnumOutput("pneumatic_cushion_type", cushionType),
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
      operatingPressure,
      loadFactor,
      cushionType,
      mountingStyle,
      bucklingSafetyFactor,
      rollOffset,
      pitchOffset,
      yawOffset,
      rollMomentNm,
      pitchMomentNm,
      yawMomentNm,
      requiredMomentNm,
    }),
    checks: buildChecks(),
    warnings: [],
    assumptions: [
      {
        id: "no-per-candidate-check-in-this-run",
        statement:
          "This run computes a required specification for catalog matching; it does not check one specific candidate cylinder. Force capacity, buckling, allowable lateral load, and allowable rotational torque against a real catalog candidate are evaluated by lib/application/catalogs/guided-cylinder-matching.ts once catalog candidates exist.",
      },
      {
        id: "process-force-extend-only",
        statement:
          "The optional process force is applied on the extend stroke only, a disclosed 0.1.0 simplification (context/modules/guided-cylinder-sizing/stage-2-contract.md Decision 3).",
        value: resolvedProcessForce,
      },
      {
        id: "retract-force-may-be-negative",
        statement:
          "Required retract force may be negative for a strongly gravity-assisted return stroke on a heavy unbalanced load, meaning the actuator must resist/brake rather than drive. Reported as computed, not floored.",
      },
      {
        id: "moment-combination-is-an-assumption",
        statement:
          "The required resultant moment combines three independently-computed roll/pitch/yaw moments as a Euclidean sum (sqrt(M_roll^2 + M_pitch^2 + M_yaw^2)). Neither fetched SMC MGQ nor MGP catalog documents how to combine independently-computed moments against its own single published allowable-rotational-torque figure -- this combination method is this module's own engineering assumption, not a sourced formula (stage-2-contract.md Decision 5).",
      },
      {
        id: "cushion-energy-reported-only",
        statement:
          "Required cushion kinetic energy is reported, not checked against a candidate: neither the MGQ nor the MGP catalog publishes a discrete allowable-kinetic-energy figure by bore/cushion-type (both give a load-mass-vs-speed graph instead) -- a disclosed 0.1.0 evidence gap (stage-1-spec.md correction 5).",
      },
      {
        id: "buckling-governs-extend-disclosed-gap",
        statement:
          "Reproduces pneumatic-cylinder-sizing@0.1.0's own disclosed evidence gap: no pneumatic-cylinder-manufacturer source supplies a closed-form buckling formula; a generic Euler column formula is used, and buckling is assumed to govern on the extend (thrust) stroke only.",
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
