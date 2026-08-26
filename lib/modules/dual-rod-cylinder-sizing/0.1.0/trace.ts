// Calculation trace for the dual-rod-cylinder-sizing module. Two formula
// sections (required force, cushion kinetic energy) plus a closing
// validity-and-assumptions section -- the same shape
// pneumatic-cylinder-sizing@0.1.0's own trace uses. The required-force
// step cites no source revision: it is general Newtonian statics, not a
// manufacturer-specific formula. No moment/buckling section: this module
// has no buckling check, and the load-mass-vs-overhang-length check runs
// per-candidate in lib/application/catalogs/dual-rod-cylinder-matching.ts,
// not in this module's own run (the same treatment
// guided-cylinder-sizing@0.1.0's own trace gives its lateral-load and
// torque checks).

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
  readonly overhangLength: Quantity;
  readonly mountingOrientation: string;
  readonly operatingPressure: Quantity;
  readonly loadFactor: Quantity;
  readonly cushionType: string;
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
          methodId: "dual_rod_cylinder_sizing.required_force_extend",
          expression:
            "F_req,ext = process_force + m*g*sin(incline_angle) + m*g*mu*cos(incline_angle)",
          inputs: [
            {
              label: "F_proc",
              value: input.processForce,
              ref: "dual_rod_sizing.process_force",
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
              ref: "dual_rod_sizing.required_extend_force",
            },
          ],
          notes: [
            "General Newtonian statics (mass, standard gravity 9.80665 m/s^2, incline, Coulomb friction), not a manufacturer-specific formula -- reproduces pneumatic-cylinder-sizing@0.1.0's own forward-direction sign convention.",
            "Process force is applied on the extend stroke only -- a disclosed 0.1.0 simplification.",
          ],
        },
        {
          node: "step",
          id: "required-force-retract",
          title: "Required retract-side force",
          methodId: "dual_rod_cylinder_sizing.required_force_retract",
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
              ref: "dual_rod_sizing.required_retract_force",
            },
          ],
          notes: [
            "Reproduces pneumatic-cylinder-sizing@0.1.0's own return-direction sign convention: friction stays added (direction-symmetric), gravity's term subtracts.",
            input.requiredRetractForceN < 0
              ? "This run's own required retract force is negative: gravity assistance exceeds friction on this stroke, so the actuator must resist/brake rather than drive. Reported as computed, not floored."
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
          methodId: "dual_rod_cylinder_sizing.kinetic_energy",
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
            `Cushion type: ${input.cushionType}. Reported only in this module's own 0.1.0, not checked against a candidate: CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized -- a disclosed 0.1.0 evidence gap.`,
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
          methodId: "dual_rod_cylinder_sizing.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            `Required stroke: ${input.requiredStroke.value} mm; overhang length: ${input.overhangLength.value} mm; mounting orientation: ${input.mountingOrientation}; operating pressure: ${input.operatingPressure.value} MPa; load factor (eta): ${input.loadFactor.value}. Echoed as outputs for the catalog matcher, not evaluated as a pass/fail here.`,
            "No load case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run.",
            "Force capacity, cushion energy, and the load-mass-vs-overhang-length structural check against a specific catalog candidate are evaluated once catalog matching runs (lib/application/catalogs/dual-rod-cylinder-matching.ts), not by this module's own checks.",
            "No buckling check: unlike pneumatic-cylinder-sizing@0.1.0 and guided-cylinder-sizing@0.1.0, this module has no Euler column buckling formula. SMC's own CXS2 catalog gives no buckling formula, and this mechanism's own governing structural check is SMC's own directly-published load-mass-vs-overhang-length rating instead -- a disclosed scope difference, not a gap.",
            "The load-mass-vs-overhang-length check selects the matching seeded band from this run's own real required_stroke/max_piston_speed/mounting_orientation, then log-log-interpolates between SMC's own digitized graph points -- it reports out-of-envelope rather than extrapolating past SMC's own published range.",
          ],
        },
      ],
    },
  ]);
}
