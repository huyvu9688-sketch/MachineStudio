// Released seed definitions for the canonical parameter registry v1 (Unit 1.3).
//
// Scope of v1: the parameter groups that Phase 1A (axis application + motion
// profile) concretely needs, plus the shared project/environment group. These
// are the immediate next modules (Units 4.1 and 4.2) and their input/output
// ports are described in context/implementation-map.md.
//
// Deliberately NOT released here: the screw, guide, coupling, support-bearing,
// and drive-train *result* parameters. Their exact semantics (units,
// qualifiers, frames) depend on each module's Stage-1 engineering specification,
// which does not exist yet. Released parameter IDs are immutable
// (context/architecture.md; context/code-standards.md "Canonical Parameters"),
// so those groups are proposed and released per module at its Stage-2 parameter
// contract, bumping the registry version. See ./README.md and the progress
// tracker. The upstream motion outputs below (thrust force, peak velocity, etc.)
// already serve as the transmission modules' shared input ports.

import { makeQuantity } from "../units";
import { defineParameter } from "./define";
import type { ParameterDefinition } from "./types";

/** Semantic version of the released canonical parameter registry. */
export const PARAMETER_REGISTRY_VERSION = "1.0.0";

const massDisplay = ["kg", "g", "lbm"] as const;
const forceDisplay = ["N", "kN", "lbf"] as const;
const lengthDisplay = ["mm", "cm", "m", "in"] as const;
const speedDisplay = ["m/s", "mm/s", "in/s"] as const;
const accelDisplay = ["m/s^2", "mm/s^2", "in/s^2"] as const;

// --- Project and environment ------------------------------------------------

const projectAndEnvironment: readonly ParameterDefinition[] = [
  defineParameter({
    id: "project.supply_frequency",
    displayName: "Supply frequency",
    symbol: "f_sup",
    definition:
      "Electrical supply frequency of the installation site (e.g. 50 Hz East Japan, 60 Hz West Japan and the US). Used for market/catalog compatibility.",
    valueType: "quantity",
    canonicalUnit: "Hz",
    displayUnits: ["Hz"],
    range: { min: 0, unit: "Hz" },
  }),
  defineParameter({
    id: "project.supply_voltage_class",
    displayName: "Supply voltage class",
    symbol: "U_cls",
    definition:
      "Nominal three-phase supply voltage class of the installation site. A US 480 V class lineup is not automatically valid for a Japanese 200 V class site.",
    valueType: "enum",
    enumId: "supply_voltage_class",
    enumOptions: ["200V_class", "400V_class", "480V_class"],
  }),
  defineParameter({
    id: "env.ambient_temperature",
    displayName: "Ambient temperature",
    symbol: "T_amb",
    definition:
      "Ambient air temperature at the machine location, used for motor, drive, and lubricant derating.",
    valueType: "quantity",
    canonicalUnit: "K",
    displayUnits: ["degC", "degF", "K"],
    range: { min: -40, max: 80, unit: "degC" },
  }),
];

// --- Axis orientation, geometry, mass, and load cases -----------------------

const axisApplication: readonly ParameterDefinition[] = [
  defineParameter({
    id: "motion.axis.orientation",
    displayName: "Axis orientation",
    symbol: "orient",
    definition:
      "Orientation of the axis of travel relative to gravity: horizontal, vertical, or inclined.",
    valueType: "enum",
    enumId: "axis_orientation",
    enumOptions: ["horizontal", "vertical", "inclined"],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.incline_angle",
    displayName: "Incline angle",
    symbol: "beta",
    definition:
      "Angle of the axis of travel above horizontal. Zero for a horizontal axis, 90 degrees for a vertical axis.",
    valueType: "quantity",
    canonicalUnit: "rad",
    displayUnits: ["deg", "rad"],
    range: { min: 0, max: 90, unit: "deg" },
  }),
  defineParameter({
    id: "motion.axis.stroke_length",
    displayName: "Stroke length",
    symbol: "L_s",
    definition: "Usable travel of the axis between its end limits.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.payload_mass",
    displayName: "Payload mass",
    symbol: "m_p",
    definition:
      "Mass of the payload (workpiece or product) carried by the moving element of the axis.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.carriage_mass",
    displayName: "Carriage mass",
    symbol: "m_c",
    definition:
      "Mass of the moving carriage/table itself, excluding the payload and any separately declared moving masses.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.additional_moving_mass",
    displayName: "Additional moving mass",
    symbol: "m_add",
    definition:
      "Any additional mass that moves with the carriage (fixtures, cables, tooling) not counted in the carriage or payload mass.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
  }),
  defineParameter({
    id: "motion.axis.total_moving_mass",
    displayName: "Total moving mass",
    symbol: "m_t",
    definition:
      "Resolved total mass in motion along the axis: carriage plus payload plus additional moving mass.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
  }),
  defineParameter({
    id: "motion.axis.center_of_mass_offset",
    displayName: "Center-of-mass offset",
    symbol: "r_cm",
    definition:
      "Offset of the combined moving-mass center of gravity from the guide/carriage reference point, resolved onto the axis frame.",
    valueType: "vector_quantity",
    canonicalUnit: "m",
    displayUnits: ["mm", "cm", "m", "in"],
    frame: "axis",
  }),
  defineParameter({
    id: "motion.axis.friction_coefficient",
    displayName: "Friction coefficient",
    symbol: "mu",
    definition:
      "Assumed coefficient of friction opposing motion (guide/seal friction), applied to the normal load.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, max: 1, unit: "ratio" },
  }),
  defineParameter({
    id: "motion.axis.gravity",
    displayName: "Gravitational acceleration",
    symbol: "g",
    definition:
      "Standard gravitational acceleration used to resolve gravitational load components.",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: ["m/s^2"],
    range: { min: 0, unit: "m/s^2" },
    defaultPolicy: { kind: "constant", value: makeQuantity(9.80665, "m/s^2") },
  }),
  defineParameter({
    id: "motion.axis.duty_cycle",
    displayName: "Duty cycle",
    symbol: "ED",
    definition:
      "Fraction of the total cycle time during which the axis is in motion, used for thermal/RMS duty aggregation.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
  }),
  defineParameter({
    id: "motion.axis.external_force",
    displayName: "External process force",
    symbol: "F_ext",
    definition:
      "External process force acting on the moving element (e.g. a machining or insertion force), resolved onto the axis frame, per load case.",
    valueType: "vector_quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    frame: "axis",
    loadCases: ["normal", "peak"],
  }),
  defineParameter({
    id: "motion.axis.external_moment",
    displayName: "External process moment",
    symbol: "M_ext",
    definition:
      "External process moment acting on the moving element, resolved onto the axis frame, per load case.",
    valueType: "vector_quantity",
    canonicalUnit: "N*m",
    displayUnits: ["N*m", "N*mm", "lbf*in"],
    frame: "axis",
    loadCases: ["normal", "peak"],
  }),
  defineParameter({
    id: "motion.axis.gravitational_force",
    displayName: "Gravitational force component",
    symbol: "F_g",
    definition:
      "Component of the moving-mass weight acting along the axis of travel (nonzero for inclined and vertical axes).",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    frame: "axis",
  }),
  defineParameter({
    id: "motion.axis.thrust_force",
    displayName: "Required thrust force",
    symbol: "F_a",
    definition:
      "Resolved axial thrust force the drive train must deliver along the axis, per load case (sum of inertial, gravitational, friction, and external contributions).",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    frame: "axis",
    qualifiers: { bound: "required" },
    loadCases: ["normal", "peak", "holding", "emergency_stop"],
  }),
];

// --- Motion profile ---------------------------------------------------------

const motionProfile: readonly ParameterDefinition[] = [
  defineParameter({
    id: "motion.profile.move_distance",
    displayName: "Move distance",
    symbol: "d",
    definition: "Commanded travel distance of a single positioning move.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.profile.move_time",
    displayName: "Move time",
    symbol: "t_m",
    definition: "Time to complete a single positioning move, excluding dwell.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
  }),
  defineParameter({
    id: "motion.profile.dwell_time",
    displayName: "Dwell time",
    symbol: "t_d",
    definition: "Stationary dwell time following a move, within one cycle.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
  }),
  defineParameter({
    id: "motion.profile.cycle_time",
    displayName: "Cycle time",
    symbol: "t_c",
    definition:
      "Total time of one complete motion cycle (moves plus dwells), used for duty and RMS aggregation.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
  }),
  defineParameter({
    id: "motion.profile.max_velocity",
    displayName: "Maximum allowable velocity",
    symbol: "v_lim",
    definition:
      "Upper velocity limit the motion profile must not exceed (mechanical or user-imposed).",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
    qualifiers: { bound: "allowable" },
  }),
  defineParameter({
    id: "motion.profile.max_acceleration",
    displayName: "Maximum allowable acceleration",
    symbol: "a_lim",
    definition:
      "Upper acceleration limit the motion profile must not exceed (mechanical or user-imposed).",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: [...accelDisplay],
    range: { min: 0, unit: "m/s^2" },
    qualifiers: { bound: "allowable" },
  }),
  defineParameter({
    id: "motion.profile.peak_velocity",
    displayName: "Peak velocity",
    symbol: "v_max",
    definition: "Peak axis velocity reached during the move.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
  defineParameter({
    id: "motion.profile.peak_acceleration",
    displayName: "Peak acceleration",
    symbol: "a_max",
    definition: "Peak acceleration during the accelerating phase of the move.",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: [...accelDisplay],
    range: { min: 0, unit: "m/s^2" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
  defineParameter({
    id: "motion.profile.peak_deceleration",
    displayName: "Peak deceleration",
    symbol: "dec_max",
    definition: "Peak deceleration during the decelerating phase of the move.",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: [...accelDisplay],
    range: { min: 0, unit: "m/s^2" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
];

/** All released parameter definitions for registry v1, in authored order. */
export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = [
  ...projectAndEnvironment,
  ...axisApplication,
  ...motionProfile,
];
