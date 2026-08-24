// Pure, deterministic compute function for the pneumatic-cylinder module
// (v0.1.0, Stage 3). Reads input magnitudes in their canonical units
// (mm, MPa, kg, m/s, J, ratio -- see ./math.ts's own top comment for why
// mm/MPa is used directly rather than converting to SI), delegates the
// physics to the pure kernel in ./math, and returns a structured
// computation. Performs no I/O and imports only the engine's public
// surface and this module's own files.

import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import { makeQuantity } from "@/lib/engine";
import {
  resolvePistonAreas,
  resolveTheoreticalForce,
  resolveCushionKineticEnergy,
  resolveBucklingLoad,
  resolvePermissibleCompressiveLoad,
  resolveAirDemand,
  type PneumaticMountingStyle,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { enumValueAt, quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const boreDiameter = quantityAt(values, "bore_diameter");
  const rodDiameter = quantityAt(values, "rod_diameter");
  const operatingPressure = quantityAt(values, "operating_pressure");
  const loadFactor = quantityAt(values, "load_factor");
  const requiredExtendForce = quantityAt(values, "required_extend_force");
  const requiredRetractForce = quantityAt(values, "required_retract_force");
  const loadMass = quantityAt(values, "load_mass");
  const maxPistonSpeed = quantityAt(values, "max_piston_speed");
  const cushionType = enumValueAt(values, "cushion_type");
  const allowableKineticEnergy = quantityAt(values, "allowable_kinetic_energy");
  const stroke = quantityAt(values, "stroke");
  const mountingStyle = enumValueAt(values, "mounting_style") as
    PneumaticMountingStyle | undefined;
  const bucklingSafetyFactor = quantityAt(values, "buckling_safety_factor");
  const pipingLength = quantityAt(values, "piping_length");
  const pipingBore = quantityAt(values, "piping_bore");

  if (
    boreDiameter === undefined ||
    rodDiameter === undefined ||
    operatingPressure === undefined ||
    loadFactor === undefined ||
    loadMass === undefined ||
    maxPistonSpeed === undefined ||
    cushionType === undefined ||
    stroke === undefined ||
    mountingStyle === undefined ||
    bucklingSafetyFactor === undefined ||
    pipingLength === undefined
  ) {
    throw new Error(
      "pneumatic-cylinder requires its full set of geometry, pressure, load-factor, mass, speed, cushion-type, stroke, mounting-style, and buckling-safety-factor inputs.",
    );
  }

  const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
    boreDiameterMm: boreDiameter.value,
    rodDiameterMm: rodDiameter.value,
  });

  const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
    areaMm2: extendAreaMm2,
    pressureMPa: operatingPressure.value,
    loadFactor: loadFactor.value,
  });
  const { forceN: theoreticalRetractForceN } = resolveTheoreticalForce({
    areaMm2: retractAreaMm2,
    pressureMPa: operatingPressure.value,
    loadFactor: loadFactor.value,
  });

  const { kineticEnergyJ } = resolveCushionKineticEnergy({
    loadMassKg: loadMass.value,
    maxPistonSpeedMps: maxPistonSpeed.value,
  });

  const { bucklingLoadN } = resolveBucklingLoad({
    rodDiameterMm: rodDiameter.value,
    columnLengthMm: stroke.value,
    mountingStyle,
  });
  const { permissibleCompressiveLoadN } = resolvePermissibleCompressiveLoad({
    bucklingLoadN,
    bucklingSafetyFactor: bucklingSafetyFactor.value,
  });
  // The rod is assumed to be in axial compression only on the extend
  // (thrust) stroke -- see ./trace.ts "buckling-check" step notes and
  // context/modules/pneumatic-cylinder/stage-1-spec.md item 4.
  const governingCompressiveForceN = theoreticalExtendForceN;

  const { airConsumptionPerCycleL, requiredAirVolumeLPerMin } =
    resolveAirDemand({
      extendAreaMm2,
      retractAreaMm2,
      strokeMm: stroke.value,
      pressureMPa: operatingPressure.value,
      pipingBoreMm: pipingBore?.value ?? 0,
      pipingLengthMm: pipingLength.value,
      maxPistonSpeedMps: maxPistonSpeed.value,
    });

  const outputs: Record<string, Quantity> = {
    theoretical_extend_force: makeQuantity(theoreticalExtendForceN, "N"),
    theoretical_retract_force: makeQuantity(theoreticalRetractForceN, "N"),
    kinetic_energy: makeQuantity(kineticEnergyJ, "J"),
    buckling_load: makeQuantity(bucklingLoadN, "N"),
    permissible_compressive_load: makeQuantity(
      permissibleCompressiveLoadN,
      "N",
    ),
    air_consumption_per_cycle: makeQuantity(airConsumptionPerCycleL, "L"),
    required_air_volume: makeQuantity(requiredAirVolumeLPerMin, "L/min"),
  };

  return {
    outputs,
    trace: buildTrace({
      boreDiameter,
      rodDiameter,
      operatingPressure,
      loadFactor,
      extend: {
        areaMm2: extendAreaMm2,
        theoreticalForceN: theoreticalExtendForceN,
        requiredForce: requiredExtendForce,
      },
      retract: {
        areaMm2: retractAreaMm2,
        theoreticalForceN: theoreticalRetractForceN,
        requiredForce: requiredRetractForce,
      },
      loadMass,
      maxPistonSpeed,
      cushionType,
      kineticEnergyJ,
      allowableKineticEnergy,
      stroke,
      mountingStyle,
      bucklingSafetyFactor,
      bucklingLoadN,
      permissibleCompressiveLoadN,
      governingCompressiveForceN,
      pipingLength,
      pipingBore,
      airConsumptionPerCycleL,
      requiredAirVolumeLPerMin,
    }),
    checks: buildChecks({
      boreDiameter,
      rodDiameter,
      extend: {
        theoreticalForceN: theoreticalExtendForceN,
        requiredForce: requiredExtendForce,
      },
      retract: {
        theoreticalForceN: theoreticalRetractForceN,
        requiredForce: requiredRetractForce,
      },
      cushionType,
      kineticEnergyJ,
      allowableKineticEnergy,
      governingCompressiveForceN,
      permissibleCompressiveLoadN,
    }),
    warnings: [],
    assumptions: [
      {
        id: "single-cylinder-single-load",
        statement:
          "This module version (0.1.0) checks one cylinder against one load in one installation -- not a multi-cylinder system, rodless, or guided-slide variant.",
      },
      {
        id: "required-force-engineer-supplied",
        statement:
          "Required extend/retract force is engineer-supplied, not derived from a load mass and an assumed friction/lift condition. Milwaukee Cylinder's own load-type percentage method (50-75% of actual load for a sliding load at breakaway, etc.) is upstream engineering guidance this module documents but does not implement as a formula.",
      },
      {
        id: "buckling-governs-on-extend-side",
        statement:
          "The piston rod is assumed to be in axial compression only on the extend (thrust) stroke; the buckling check uses pneumatic.theoretical_extend_force as the governing compressive force. A retract-side (pulling) load is assumed to put the rod in tension, not buckling risk, in this module's own single-load model.",
      },
      {
        id: "buckling-safety-factor-supplied",
        statement:
          "The buckling safety factor (a divisor applied to the theoretical Euler load) is engineer-supplied, not a built-in constant: no pneumatic-cylinder-manufacturer source read for this module gives a specific value, only a generic hydraulic-industry reference's 'S = 3...5' range.",
        value: bucklingSafetyFactor,
      },
      {
        id: "air-demand-simplifications",
        statement:
          "pneumatic.air_consumption_per_cycle and pneumatic.required_air_volume (reported, not evaluated) assume identical extend/retract piping legs (one piping_length/piping_bore pair, not SMC's own independent per-side pair) and approximate stroke time as stroke / max_piston_speed (a constant-speed approximation; this module has no dedicated stroke-time input).",
      },
    ],
    validity: [],
  };
}
