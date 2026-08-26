// Calculation trace for the guided-cylinder-sizing module. Three formula
// sections (required force, required moment, cushion kinetic energy) plus
// a closing validity-and-assumptions section -- the same shape
// pneumatic-cylinder-sizing@0.1.0's own trace uses, with a new moment
// section. The required-force step cites no source revision: it is
// general Newtonian statics, not a manufacturer-specific formula -- the
// same treatment pneumatic-cylinder-sizing@0.1.0's own trace already
// established. The moment step likewise cites no source: it is ordinary
// statics (M = F*d) plus this module's own disclosed Euclidean-sum
// combination assumption, not a sourced formula.

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
  readonly rollOffset: Quantity;
  readonly pitchOffset: Quantity;
  readonly yawOffset: Quantity;
  readonly rollMomentNm: number;
  readonly pitchMomentNm: number;
  readonly yawMomentNm: number;
  readonly requiredMomentNm: number;
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
          methodId: "guided_cylinder_sizing.required_force_extend",
          expression:
            "F_req,ext = process_force + m*g*sin(incline_angle) + m*g*mu*cos(incline_angle)",
          inputs: [
            {
              label: "F_proc",
              value: input.processForce,
              ref: "pneumatic_guided_sizing.process_force",
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
              ref: "pneumatic_guided_sizing.required_extend_force",
            },
          ],
          notes: [
            "General Newtonian statics (mass, standard gravity 9.80665 m/s^2, incline, Coulomb friction), not a manufacturer-specific formula -- reproduces pneumatic-cylinder-sizing@0.1.0's own forward-direction sign convention (context/modules/guided-cylinder-sizing/stage-2-contract.md Decision 2).",
            "Process force is applied on the extend stroke only (Decision 3) -- a disclosed 0.1.0 simplification.",
            "Also the lateral force this run's own moment resolution converts into roll/pitch/yaw moments (see the 'Required resultant moment' section below).",
          ],
        },
        {
          node: "step",
          id: "required-force-retract",
          title: "Required retract-side force",
          methodId: "guided_cylinder_sizing.required_force_retract",
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
              ref: "pneumatic_guided_sizing.required_retract_force",
            },
          ],
          notes: [
            "Reproduces pneumatic-cylinder-sizing@0.1.0's own return-direction sign convention: friction stays added (direction-symmetric), gravity's term subtracts.",
            input.requiredRetractForceN < 0
              ? "This run's own required retract force is negative: gravity assistance exceeds friction on this stroke, so the actuator must resist/brake rather than drive. Reported as computed, not floored -- the catalog matcher floors it at 0 N only when building its own force-capacity criterion."
              : "This run's own required retract force is non-negative.",
          ],
        },
      ],
    },
    {
      node: "section",
      id: "required-moment",
      title: "Required resultant moment",
      children: [
        {
          node: "step",
          id: "required-moment-components",
          title: "Roll/pitch/yaw moment components",
          methodId: "guided_cylinder_sizing.required_moment_components",
          expression:
            "M_roll = F_req,ext*roll_offset; M_pitch = F_req,ext*pitch_offset; M_yaw = F_req,ext*yaw_offset",
          inputs: [
            {
              label: "F_req,ext",
              value: makeQuantity(Math.max(0, input.requiredExtendForceN), "N"),
              ref: "pneumatic_guided_sizing.required_extend_force",
            },
            {
              label: "d_roll",
              value: input.rollOffset,
              ref: "pneumatic_guided_sizing.roll_offset",
            },
            {
              label: "d_pitch",
              value: input.pitchOffset,
              ref: "pneumatic_guided_sizing.pitch_offset",
            },
            {
              label: "d_yaw",
              value: input.yawOffset,
              ref: "pneumatic_guided_sizing.yaw_offset",
            },
          ],
          outputs: [
            {
              label: "M_roll",
              value: makeQuantity(input.rollMomentNm, "N*m"),
            },
            {
              label: "M_pitch",
              value: makeQuantity(input.pitchMomentNm, "N*m"),
            },
            {
              label: "M_yaw",
              value: makeQuantity(input.yawMomentNm, "N*m"),
            },
          ],
          notes: [
            "Ordinary statics (M = F*d), not a manufacturer-specific formula. Uses the required extend-side force (floored at 0 N) as the lateral force each offset acts through.",
          ],
        },
        {
          node: "step",
          id: "required-moment-resultant",
          title: "Combined resultant moment",
          methodId: "guided_cylinder_sizing.required_moment_resultant",
          expression: "M_req = sqrt(M_roll^2 + M_pitch^2 + M_yaw^2)",
          inputs: [
            { label: "M_roll", value: makeQuantity(input.rollMomentNm, "N*m") },
            { label: "M_pitch", value: makeQuantity(input.pitchMomentNm, "N*m") },
            { label: "M_yaw", value: makeQuantity(input.yawMomentNm, "N*m") },
          ],
          outputs: [
            {
              label: "M_req",
              value: makeQuantity(input.requiredMomentNm, "N*m"),
              ref: "pneumatic_guided_sizing.required_moment",
            },
          ],
          notes: [
            "Checked against each MGQ/MGP catalog candidate's own single published allowable-rotational-torque-of-plate rating by the catalog matcher (lib/application/catalogs/guided-cylinder-matching.ts), not by this module's own run.",
            "The Euclidean-sum combination is this module's own engineering assumption, not a value SMC's own catalog documents: neither fetched MGQ nor MGP catalog gives guidance on combining independently-computed moments against its one published figure (context/modules/guided-cylinder-sizing/stage-2-contract.md Decision 5) -- a disclosed 0.1.0 limitation, not silently presented as sourced.",
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
          methodId: "guided_cylinder_sizing.kinetic_energy",
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
            `Cushion type: ${input.cushionType}. Reported only in this module's own 0.1.0, not checked against a candidate: neither the MGQ nor the MGP catalog publishes a discrete allowable-kinetic-energy figure by bore/cushion-type (both give a load-mass-vs-speed graph instead) -- a disclosed 0.1.0 evidence gap.`,
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
          methodId: "guided_cylinder_sizing.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            `Required stroke: ${input.requiredStroke.value} mm; operating pressure: ${input.operatingPressure.value} MPa; load factor (eta): ${input.loadFactor.value}; mounting style: ${input.mountingStyle}; buckling safety factor: ${input.bucklingSafetyFactor.value}. Echoed as outputs for the catalog matcher, not evaluated as a pass/fail here.`,
            "No load case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run.",
            "Force capacity, buckling, allowable lateral load, and allowable rotational torque against a specific catalog candidate are evaluated once catalog matching runs (lib/application/catalogs/guided-cylinder-matching.ts), not by this module's own checks.",
            "Reproduces pneumatic-cylinder-sizing@0.1.0's own disclosed evidence gap: no pneumatic-cylinder-manufacturer source supplies a closed-form buckling formula; a generic Euler column formula is used instead, and buckling is assumed to govern on the extend (thrust) stroke only.",
            "Allowable lateral load is checked for MGQ candidates only -- MGP's own catalog publishes a plate-displacement stiffness graph, not a discrete allowable-load rating, for the equivalent data (a real, confirmed cross-series catalog gap, not a module scope choice).",
          ],
        },
      ],
    },
  ]);
}
