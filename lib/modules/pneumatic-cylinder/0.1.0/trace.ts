// Calculation trace for the pneumatic-cylinder module. Follows the trace
// contract proposed in context/modules/pneumatic-cylinder/stage-1-spec.md
// "Trace Contract (Proposed)": theoretical force, cushion kinetic energy,
// buckling, air consumption, and a closing validity-and-assumptions
// section. Cites SMC's own formulas where this module implements them
// directly; the buckling step cites no source (a generic Euler formula, not
// sourced from a pneumatic-cylinder manufacturer -- see that step's own
// notes) rather than fabricate a citation to a source that does not supply
// this specific formula.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const SMC_AIR_CYLINDERS_MODEL_SELECTION = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    clause: "Technical Data 1-4, formulas (1)-(2)",
    label: "F = eta * A * P",
  },
];

const SMC_CUSHION_KINETIC_ENERGY = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    clause: "Technical Data 1-4, formula (7)",
    label: "E = (m/2) * V^2",
  },
];

const SMC_AIR_CONSUMPTION = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    clause: "Technical Data 1-4, formulas (8)-(16)",
    label: "qc=A*L*(P+0.1)/0.1*1e-6, qp=a*l*P/0.1*1e-6, Q=max(Q1,Q2)",
  },
];

export interface TraceForceSideInput {
  readonly areaMm2: number;
  readonly theoreticalForceN: number;
  readonly requiredForce: Quantity | undefined;
}

export interface TraceInput {
  readonly boreDiameter: Quantity;
  readonly rodDiameter: Quantity;
  readonly operatingPressure: Quantity;
  readonly loadFactor: Quantity;
  readonly extend: TraceForceSideInput;
  readonly retract: TraceForceSideInput;
  readonly loadMass: Quantity;
  readonly maxPistonSpeed: Quantity;
  readonly cushionType: string;
  readonly kineticEnergyJ: number;
  readonly allowableKineticEnergy: Quantity | undefined;
  readonly stroke: Quantity;
  readonly mountingStyle: string;
  readonly bucklingSafetyFactor: Quantity;
  readonly bucklingLoadN: number;
  readonly permissibleCompressiveLoadN: number;
  readonly governingCompressiveForceN: number;
  readonly pipingLength: Quantity;
  readonly pipingBore: Quantity | undefined;
  readonly airConsumptionPerCycleL: number;
  readonly requiredAirVolumeLPerMin: number;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  // Piston area (A1/A2) has no representable unit in this project's unit
  // registry (no "area" dimension is registered -- this module's own
  // registry deliberately did not add one, since piston area is an
  // internal kernel intermediate, not a registered pneumatic.* port).
  // Trace steps therefore cite the geometric formula and the computed
  // area's bare mm^2 magnitude in a text note rather than as a boxed
  // EngineeringValue, and take bore/rod diameter as their own quantity
  // inputs instead of a derived area.
  const theoreticalForceStep = (
    side: "extend" | "retract",
    sideInput: TraceForceSideInput,
    areaFormula: string,
  ) => ({
    node: "step" as const,
    id: `theoretical-force-${side}`,
    title: `Theoretical ${side} force`,
    methodId: `pneumatic_cylinder.theoretical_force_${side}`,
    expression: `F = eta * A * P, ${areaFormula}`,
    inputs: [
      {
        label: "D",
        value: input.boreDiameter,
        ref: "pneumatic.bore_diameter",
      },
      {
        label: "d",
        value: input.rodDiameter,
        ref: "pneumatic.rod_diameter",
      },
      {
        label: "eta",
        value: input.loadFactor,
        ref: "pneumatic.load_factor",
      },
      {
        label: "P",
        value: input.operatingPressure,
        ref: "pneumatic.operating_pressure",
      },
    ],
    outputs: [
      {
        label: "F",
        value: makeQuantity(sideInput.theoreticalForceN, "N"),
        ref: `pneumatic.theoretical_${side}_force`,
      },
    ],
    sources: SMC_AIR_CYLINDERS_MODEL_SELECTION,
    notes: [
      `A = ${sideInput.areaMm2.toFixed(1)} mm^2 (direct geometric formula, not a manufacturer-specific method -- matches SMC's own printed piston-area table to catalog-rounding precision, context/modules/pneumatic-cylinder/stage-2-contract.md 'Stage 3 Entry Criteria' item 3).`,
      sideInput.requiredForce === undefined
        ? `No required ${side} force supplied; not checked against pneumatic.required_${side}_force.`
        : `Checked against the engineer-supplied pneumatic.required_${side}_force = ${sideInput.requiredForce.value} N.`,
    ],
  });

  return buildCalculationTrace([
    {
      node: "section",
      id: "theoretical-force",
      title: "Theoretical force",
      children: [
        theoreticalForceStep("extend", input.extend, "A1 = pi*D^2/4"),
        theoreticalForceStep("retract", input.retract, "A2 = pi*(D^2-d^2)/4"),
      ],
    },
    {
      node: "section",
      id: "cushion-kinetic-energy",
      title: "Cushion kinetic energy",
      children: [
        {
          node: "step",
          id: "kinetic-energy",
          title: "End-of-stroke kinetic energy",
          methodId: "pneumatic_cylinder.kinetic_energy",
          expression: "E = (m/2) * V^2",
          inputs: [
            { label: "m", value: input.loadMass, ref: "pneumatic.load_mass" },
            {
              label: "V",
              value: input.maxPistonSpeed,
              ref: "pneumatic.max_piston_speed",
            },
          ],
          outputs: [
            {
              label: "E",
              value: makeQuantity(input.kineticEnergyJ, "J"),
              ref: "pneumatic.kinetic_energy",
            },
          ],
          sources: SMC_CUSHION_KINETIC_ENERGY,
          notes: [
            `Cushion type: ${input.cushionType}.`,
            input.allowableKineticEnergy === undefined
              ? 'No cushion selected ("none"); not checked against an allowable energy.'
              : `Checked against pneumatic.allowable_kinetic_energy = ${input.allowableKineticEnergy.value} J.`,
          ],
        },
      ],
    },
    {
      node: "section",
      id: "buckling",
      title: "Piston-rod buckling",
      children: [
        {
          node: "step",
          id: "buckling-load",
          title: "Theoretical and permissible buckling load",
          methodId: "pneumatic_cylinder.buckling_load",
          expression:
            "Fk = factor(mounting_style) * pi^2 * E_steel * J / L^2, J = pi*d^4/64",
          inputs: [
            {
              label: "d",
              value: input.rodDiameter,
              ref: "pneumatic.rod_diameter",
            },
            { label: "L", value: input.stroke, ref: "pneumatic.stroke" },
          ],
          outputs: [
            {
              label: "Fk",
              value: makeQuantity(input.bucklingLoadN, "N"),
              ref: "pneumatic.buckling_load",
            },
            {
              label: "F_perm",
              value: makeQuantity(input.permissibleCompressiveLoadN, "N"),
              ref: "pneumatic.permissible_compressive_load",
            },
          ],
          notes: [
            `Mounting style (Euler end-fixity): ${input.mountingStyle}.`,
            "Generic Euler column formula: textbook physics (E_steel = 210,000 N/mm^2, the same four end-fixity cases ball-screw's own kernel uses), not sourced from a pneumatic-cylinder manufacturer -- no source read for this module gives a complete, directly citable, pneumatic-specific closed-form buckling formula (context/modules/pneumatic-cylinder/stage-1-spec.md item 4).",
            `Permissible load = theoretical load / pneumatic.buckling_safety_factor (= ${input.bucklingSafetyFactor.value}, engineer-supplied, no built-in default -- no pneumatic-manufacturer source gives a specific value, context/modules/pneumatic-cylinder/stage-2-contract.md "Decisions" item 3).`,
            "Uses pneumatic.stroke as the buckling column's own unsupported length (this module's own registry has no separate unsupported-length port).",
          ],
        },
        {
          node: "step",
          id: "buckling-check",
          title: "Buckling margin check",
          methodId: "pneumatic_cylinder.buckling_check",
          expression: "F_governing <= F_perm",
          inputs: [
            {
              label: "F_governing",
              value: makeQuantity(input.governingCompressiveForceN, "N"),
            },
            {
              label: "F_perm",
              value: makeQuantity(input.permissibleCompressiveLoadN, "N"),
            },
          ],
          outputs: [],
          notes: [
            "The piston rod is assumed to be in axial compression only on the extend (thrust) stroke -- the governing compressive force is pneumatic.theoretical_extend_force. A retract-side (pulling) load is assumed to put the rod in tension, not buckling risk, in this module's own single-load model.",
          ],
        },
      ],
    },
    {
      node: "section",
      id: "air-consumption",
      title:
        "Air consumption and required air volume (reported, not evaluated)",
      children: [
        {
          node: "step",
          id: "air-demand",
          title: "Air consumption per cycle and required air volume",
          methodId: "pneumatic_cylinder.air_demand",
          expression:
            "q = qc1+qp1+qc2+qp2; Q = max((qc1+qp1)/t*60, (qc2+qp2)/t*60)",
          inputs: [
            { label: "L", value: input.stroke, ref: "pneumatic.stroke" },
            {
              label: "P",
              value: input.operatingPressure,
              ref: "pneumatic.operating_pressure",
            },
            {
              label: "l",
              value: input.pipingLength,
              ref: "pneumatic.piping_length",
            },
            ...(input.pipingBore === undefined
              ? []
              : [
                  {
                    label: "a (bore)",
                    value: input.pipingBore,
                    ref: "pneumatic.piping_bore",
                  },
                ]),
          ],
          outputs: [
            {
              label: "q",
              value: makeQuantity(input.airConsumptionPerCycleL, "L"),
              ref: "pneumatic.air_consumption_per_cycle",
            },
            {
              label: "Q",
              value: makeQuantity(input.requiredAirVolumeLPerMin, "L/min"),
              ref: "pneumatic.required_air_volume",
            },
          ],
          sources: SMC_AIR_CONSUMPTION,
          notes: [
            "Reported, not evaluated -- informational for compressor/FRL-equipment sizing outside this module's own scope (stage-1-spec.md 'Validity Envelope').",
            "Two documented simplifications: the extend and retract piping legs are assumed identical (this module has one piping_length/piping_bore pair, not SMC's own independent per-side pair), and stroke time is approximated as stroke / max_piston_speed (a constant-speed approximation; this module has no dedicated stroke-time input) -- see ./math.ts resolveAirDemand doc comment.",
          ],
        },
      ],
    },
    {
      node: "section",
      id: "validity-and-assumptions",
      title: "Validity and assumptions",
      children: [
        {
          node: "step",
          id: "scope-notes",
          title: "Scope and assumptions",
          methodId: "pneumatic_cylinder.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "One cylinder, one load, one installation -- not a multi-cylinder system, rodless, or guided-slide variant.",
            "No load case (normal/peak/etc.) semantics: force, mass, and speed are each a single engineer-supplied value per run.",
            "Required force is engineer-supplied, not derived from a load mass and an assumed friction/lift condition; Milwaukee Cylinder's own load-type percentage method is documented upstream engineering guidance, not a formula this module implements.",
            "Piston speed at end of stroke is a required engineer-supplied input, never computed -- both candidate sources state directly that piston speed cannot be calculated from a formula.",
            "Lateral (side) rod-end load and condensation risk are out of scope for this version.",
          ],
        },
      ],
    },
  ]);
}
