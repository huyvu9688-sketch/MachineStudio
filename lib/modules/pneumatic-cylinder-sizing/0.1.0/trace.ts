// Calculation trace for the pneumatic-cylinder-sizing module. Two
// formula sections (required force, cushion kinetic energy) plus a
// closing validity-and-assumptions section -- the same shape
// pneumatic-cylinder@0.1.0's own trace uses. The required-force step
// cites no source revision: it is general Newtonian statics (mass,
// gravity, incline, friction), the same "textbook physics, not a
// manufacturer-specific formula" treatment ball-screw-motor-sizing's own
// resolveDriveForce trace step already established -- not a fabricated
// citation to a source that does not supply this specific formula.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const SMC_CUSHION_KINETIC_ENERGY = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    clause: "Technical Data 1-4, formula (7)",
    label: "E = (m/2) * V^2",
  },
];

export interface TraceInput {
  readonly processForce: Quantity;
  readonly loadMass: Quantity;
  readonly inclineAngle: Quantity;
  readonly frictionCoefficient: Quantity;
  readonly requiredExtendForceN: number;
  readonly requiredRetractForceN: number;
  readonly maxPistonSpeed: Quantity;
  readonly kineticEnergyJ: number;
  readonly requiredStroke: Quantity;
  readonly operatingPressure: Quantity;
  readonly loadFactor: Quantity;
  readonly cushionType: string;
  readonly mountingStyle: string;
  readonly bucklingSafetyFactor: Quantity;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  return buildCalculationTrace([
    {
      node: "section",
      id: "required-force",
      title: "Required extend/retract force",
      children: [
        {
          node: "step",
          id: "required-force-extend",
          title: "Required extend-side force",
          methodId: "pneumatic_cylinder_sizing.required_force_extend",
          expression:
            "F_req,ext = process_force + m*g*sin(incline_angle) + m*g*mu*cos(incline_angle)",
          inputs: [
            {
              label: "F_proc",
              value: input.processForce,
              ref: "pneumatic_sizing.process_force",
            },
            {
              label: "m",
              value: input.loadMass,
              ref: "motion.axis.total_moving_mass",
            },
            {
              label: "theta",
              value: input.inclineAngle,
              ref: "motion.axis.incline_angle",
            },
            {
              label: "mu",
              value: input.frictionCoefficient,
              ref: "motion.axis.friction_coefficient",
            },
          ],
          outputs: [
            {
              label: "F_req,ext",
              value: makeQuantity(input.requiredExtendForceN, "N"),
              ref: "pneumatic_sizing.required_extend_force",
            },
          ],
          notes: [
            "General Newtonian statics (mass, standard gravity 9.80665 m/s^2, incline, Coulomb friction), not a manufacturer-specific formula -- reproduces ball-screw-motor-sizing@0.2.0's own forward-direction sign convention (context/modules/pneumatic-cylinder-sizing/stage-2-contract.md Decision 1).",
            "Process force is applied on the extend stroke only (Decision 3) -- a disclosed 0.1.0 simplification.",
          ],
        },
        {
          node: "step",
          id: "required-force-retract",
          title: "Required retract-side force",
          methodId: "pneumatic_cylinder_sizing.required_force_retract",
          expression: "F_req,ret = m*g*mu*cos(incline_angle) - m*g*sin(incline_angle)",
          inputs: [
            {
              label: "m",
              value: input.loadMass,
              ref: "motion.axis.total_moving_mass",
            },
            {
              label: "theta",
              value: input.inclineAngle,
              ref: "motion.axis.incline_angle",
            },
            {
              label: "mu",
              value: input.frictionCoefficient,
              ref: "motion.axis.friction_coefficient",
            },
          ],
          outputs: [
            {
              label: "F_req,ret",
              value: makeQuantity(input.requiredRetractForceN, "N"),
              ref: "pneumatic_sizing.required_retract_force",
            },
          ],
          notes: [
            "Reproduces ball-screw-motor-sizing@0.2.0's own return-direction sign convention: friction stays added (direction-symmetric), gravity's term subtracts.",
            input.requiredRetractForceN < 0
              ? "This run's own required retract force is negative: gravity assistance exceeds friction on this stroke, so the actuator must resist/brake rather than drive. Reported as computed, not floored -- the catalog matcher floors it at 0 N only when building its own force-capacity criterion."
              : "This run's own required retract force is non-negative.",
          ],
        },
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
          title: "Required end-of-stroke kinetic energy",
          methodId: "pneumatic_cylinder_sizing.kinetic_energy",
          expression: "E = (m/2) * V^2",
          inputs: [
            { label: "m", value: input.loadMass, ref: "motion.axis.total_moving_mass" },
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
            `Cushion type: ${input.cushionType}. Checked against each catalog candidate's own allowable kinetic energy for this cushion type by the catalog matcher (lib/application/catalogs/pneumatic-cylinder-matching.ts), not by this module's own run.`,
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
          methodId: "pneumatic_cylinder_sizing.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            `Required stroke: ${input.requiredStroke.value} mm; operating pressure: ${input.operatingPressure.value} MPa; load factor (eta): ${input.loadFactor.value}; mounting style: ${input.mountingStyle}; buckling safety factor: ${input.bucklingSafetyFactor.value}. Echoed as outputs for the catalog matcher, not evaluated as a pass/fail here.`,
            "No load case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run.",
            "Force capacity, cushion energy, and buckling against a specific catalog candidate are evaluated once catalog matching runs (lib/application/catalogs/pneumatic-cylinder-matching.ts), not by this module's own checks.",
            "Reproduces pneumatic-cylinder@0.1.0's own disclosed evidence gap: no pneumatic-cylinder-manufacturer source supplies a closed-form buckling formula; a generic Euler column formula is used instead, and buckling is assumed to govern on the extend (thrust) stroke only.",
            "Lateral (side) rod-end load is out of scope, matching pneumatic-cylinder@0.1.0.",
          ],
        },
      ],
    },
  ]);
}
