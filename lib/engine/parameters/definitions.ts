// Released seed definitions for the canonical parameter registry v1.3 (Units
// 1.3, 4.1 Stage 2, 4.2 Stage 2, and 4.3 Stage 2).
//
// Scope of v1.0: the parameter groups that Phase 1A (axis application + motion
// profile) concretely needs, plus the shared project/environment group. These
// are the immediate next modules (Units 4.1 and 4.2) and their input/output
// ports are described in context/implementation-map.md. v1.1 added
// axis-load-case scope refinements (context/modules/axis-load-cases/
// stage-2-contract.md). v1.2 adds motion-profile's cycle-level RMS
// acceleration output (context/modules/motion-profile/stage-2-contract.md).
// v1.3 adds two axis-scope per-case parameters (case_time_fraction,
// case_linear_velocity) and the full screw.* group for ball-screw
// (context/modules/ball-screw/stage-2-contract.md).
//
// Deliberately NOT released here: the guide, coupling, support-bearing, and
// drive-train *result* parameters. Their exact semantics (units, qualifiers,
// frames) depend on each module's Stage-1 engineering specification, which
// does not exist yet. Released parameter IDs are immutable
// (context/architecture.md; context/code-standards.md "Canonical Parameters"),
// so those groups are proposed and released per module at its Stage-2 parameter
// contract, bumping the registry version. See ./README.md and the progress
// tracker. The upstream motion outputs below (thrust force, peak velocity, etc.)
// already serve as the transmission modules' shared input ports.

import { makeQuantity } from "../units";
import { defineParameter } from "./define";
import type { ParameterDefinition } from "./types";

/** Semantic version of the released canonical parameter registry. */
export const PARAMETER_REGISTRY_VERSION = "1.3.0";

const massDisplay = ["kg", "g", "lbm"] as const;
const forceDisplay = ["N", "kN", "lbf"] as const;
const lengthDisplay = ["mm", "cm", "m", "in"] as const;
const speedDisplay = ["m/s", "mm/s", "in/s"] as const;
const accelDisplay = ["m/s^2", "mm/s^2", "in/s^2"] as const;
const movingLoadCases = ["normal", "peak", "emergency_stop"] as const;

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
    id: "motion.axis.case_travel_direction",
    displayName: "Load-case travel direction",
    symbol: "dir_case",
    definition:
      "Direction of travel for a moving axis load case relative to the declared +X axis direction. Positive means velocity in +X; negative means velocity in -X. Holding is stationary and intentionally has no direction port.",
    valueType: "enum",
    enumId: "axis_travel_direction",
    enumOptions: ["positive", "negative"],
    frame: "axis",
    loadCases: movingLoadCases,
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.case_axial_acceleration",
    displayName: "Load-case axial acceleration",
    symbol: "a_case",
    definition:
      "Signed translational acceleration of the moving assembly along +X for a declared moving load case. Its sign is independent of travel direction; negative denotes acceleration toward -X.",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: [...accelDisplay],
    qualifiers: { bound: "required", loadNature: "dynamic" },
    frame: "axis",
    loadCases: movingLoadCases,
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.case_time_fraction",
    displayName: "Load-case time fraction",
    symbol: "q_case",
    definition:
      "Fraction of the total duty cycle spent in this specific load case, used to weight per-case contributions in a duty-cycle aggregation (e.g. equivalent dynamic load for a rotating component). Distinct from motion.axis.duty_cycle, which is a single motion-vs-stationary ratio, not indexed per case.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    frame: "none",
    loadCases: movingLoadCases,
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.case_linear_velocity",
    displayName: "Load-case linear velocity",
    symbol: "v_case",
    definition:
      "Magnitude of the axis linear velocity during a declared moving load case, used by downstream transmission-component modules (e.g. rotational-speed and duty-cycle calculations). Distinct from motion.profile.peak_velocity, which is a single motion-cycle-level maximum, not tied to axis-load-cases' own case labels.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
    qualifiers: { bound: "required", loadNature: "dynamic" },
    loadCases: movingLoadCases,
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motion.axis.guide_resistance_force",
    displayName: "Additional guide resistance force",
    symbol: "F_r",
    definition:
      "Non-negative additional running resistance magnitude from guides, seals, or other documented sources, exclusive of the Coulomb-friction term mu times normal load. It opposes the declared moving travel direction; enter zero explicitly when the documented method has none.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    frame: "axis",
    loadCases: movingLoadCases,
    defaultPolicy: { kind: "required" },
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
  defineParameter({
    id: "motion.profile.rms_acceleration",
    displayName: "RMS acceleration",
    symbol: "a_rms",
    definition:
      "Time-weighted RMS acceleration magnitude across every phase of one motion cycle (accel/cruise/decel of every move, plus every dwell): sqrt(sum(a_i^2 * t_i) / sum(t_i)). A duty-cycle demand quantity a downstream module scales by its own inertia/friction model into RMS torque; this module does not compute torque itself.",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: [...accelDisplay],
    range: { min: 0, unit: "m/s^2" },
    qualifiers: { bound: "required", aggregation: "rms" },
  }),
];

// --- Ball screw (Unit 4.3 Stage 2) ------------------------------------------
// See context/modules/ball-screw/stage-2-contract.md. `ball-screw 0.1.0`
// itself only computes the `normal`/`peak` cases, matching axis-load-cases'
// own 0.1.0 scope restriction (motion.axis.external_force/external_moment
// above use the same two-case set for the same reason).

const screwCases = ["normal", "peak"] as const;
const angularVelocityDisplay = ["rad/s", "rpm"] as const;

const ballScrew: readonly ParameterDefinition[] = [
  defineParameter({
    id: "screw.minor_diameter",
    displayName: "Screw minor (root) diameter",
    symbol: "d_r",
    definition:
      "Minor (root) diameter of the ball-screw shaft thread, not the nominal/major diameter. Required by the buckling and critical-speed formulas — stage-2-contract.md 'Diameter convention'.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.lead",
    displayName: "Screw lead",
    symbol: "P",
    definition: "Linear travel per one revolution of the ball-screw shaft.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.unsupported_length",
    displayName: "Screw unsupported length",
    symbol: "l_s",
    definition:
      "Unsupported length of the ball-screw shaft between its bearing supports, used by the buckling and critical-speed formulas.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.end_support_arrangement",
    displayName: "Screw end-support arrangement",
    symbol: "fix",
    definition:
      "Bearing end-fixity arrangement of the ball-screw shaft's own two ends (not a bearing catalog selection — see stage-1-spec.md 'Purpose'). Determines the buckling and critical-speed end-fixity coefficients.",
    valueType: "enum",
    enumId: "screw_end_support_arrangement",
    enumOptions: [
      "fixed-fixed",
      "fixed-supported",
      "supported-supported",
      "fixed-free",
    ],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.dynamic_load_rating",
    displayName: "Basic dynamic axial load rating",
    symbol: "C_a",
    definition:
      "Basic dynamic axial load rating from the specific screw's own catalog data, used by the nominal-life formula. Must be read together with screw.dynamic_load_rating_basis — a revolution-basis and a distance-basis rating are not interchangeable (stage-2-contract.md 'Dynamic-load-rating life basis').",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.dynamic_load_rating_basis",
    displayName: "Dynamic load rating life basis",
    symbol: "basis_Ca",
    definition:
      "Which life convention the supplied screw.dynamic_load_rating uses: 'revolutions' (10^6 rev, e.g. Steinmeyer/ISO-attributed convention) or 'distance' (10^6 inches/units of travel, e.g. Rockford Ball Screw's own catalog convention). The two are not interchangeable without converting by the screw's lead.",
    valueType: "enum",
    enumId: "screw_dynamic_load_rating_basis",
    enumOptions: ["revolutions", "distance"],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.static_load_rating",
    displayName: "Basic static axial load rating",
    symbol: "C0",
    definition:
      "Basic static axial load rating from the specific screw's own catalog data, used by the static safety factor formula.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.preload",
    displayName: "Ball-nut preload",
    symbol: "F0",
    definition:
      "Preload force applied by the ball-nut, used by the drive-torque formula's internal-friction term.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.internal_friction_coefficient",
    displayName: "Preload-nut internal friction coefficient",
    symbol: "mu0",
    definition:
      "Internal friction coefficient of the preload nut, used by the drive-torque formula's preload-friction term (source: typically 0.1-0.3).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.mechanical_efficiency",
    displayName: "Ball-screw mechanical efficiency",
    symbol: "eta",
    definition:
      "Mechanical efficiency of the ball-screw drive, used by the drive-torque formula (source: typically 0.85-0.95).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.gear_ratio",
    displayName: "Screw drive gear ratio",
    symbol: "i",
    definition:
      "Gear ratio between the ball screw and its driving shaft. 1 for a direct-connected screw with no gearbox in between (the default — a structural statement about the drive path, not a guessed physical value). A future drive-train module (Unit 4.7) may reuse or supersede this parameter once its own contract exists.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(1, "ratio") },
  }),
  defineParameter({
    id: "screw.static_safety_factor_minimum",
    displayName: "Minimum required static safety factor",
    symbol: "fs_min",
    definition:
      "Minimum acceptable static safety factor (fs = C0 / applied load) the engineer requires for this application, supplied explicitly rather than assumed by the module. Published guidance for this value varies by operating condition and is not manufacturer-standardized — stage-2-contract.md 'Static safety factor minimum' records the range this project found (MITcalc: 1.0-3.5 without vibration/impact, 2.0-5.0 with, for general industrial machinery) as a reference point, not a built-in default.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.buckling_safety_margin",
    displayName: "Buckling permissible-load safety margin",
    symbol: "Fs_buck",
    definition:
      "Multiplier applied to the theoretical (Euler column) buckling load to obtain the permissible compressive load, supplied explicitly because published sources disagree: Steinmeyer states 0.5, Rockford Ball Screw's own worked example uses 0.8 for the identical formula (stage-2-contract.md 'Buckling safety margin'). Not defaulted, so a released run always records which convention was actually used.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "screw.manufacturer_speed_limit",
    displayName: "Manufacturer rotational speed (DN) limit",
    symbol: "n_DN",
    definition:
      "Maximum rotational speed this specific screw's own catalog data states (typically derived from a DN — diameter times speed — limit). Optional: supplied only when the specific screw's manufacturer data includes it. Not a formula this module derives (stage-1-spec.md item 9).",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
  }),
  defineParameter({
    id: "screw.drive_torque",
    displayName: "Ball-screw drive torque",
    symbol: "T_L",
    definition:
      "Required load torque at the ball-screw drive input for a declared load case, per Oriental Motor's ball-screw-drive load-torque formula.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: ["N*m", "N*mm", "lbf*in"],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
    loadCases: screwCases,
  }),
  defineParameter({
    id: "screw.equivalent_dynamic_load",
    displayName: "Equivalent dynamic axial load",
    symbol: "F_m",
    definition:
      "Duty-cycle-weighted equivalent dynamic axial load across the module's supported load cases, per Steinmeyer's cube-mean formula. Used as the nominal-life formula's applied-load term.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { aggregation: "mean" },
  }),
  defineParameter({
    id: "screw.mean_rotational_speed",
    displayName: "Mean rotational speed",
    symbol: "n_m",
    definition:
      "Duty-cycle-weighted mean rotational speed across the module's supported load cases, paired with screw.equivalent_dynamic_load.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
    qualifiers: { aggregation: "mean" },
  }),
  defineParameter({
    id: "screw.nominal_life",
    displayName: "Nominal (L10) fatigue life",
    symbol: "L10",
    definition:
      "Nominal (L10) fatigue life in revolutions: the life expected to be reached by 90% of a sufficiently large number of identical screws at the given dynamic load rating under the equivalent dynamic load.",
    valueType: "quantity",
    canonicalUnit: "rev",
    displayUnits: ["rev"],
    range: { min: 0, unit: "rev" },
  }),
  defineParameter({
    id: "screw.nominal_life_hours",
    displayName: "Nominal (L10) fatigue life in hours",
    symbol: "L10h",
    definition:
      "screw.nominal_life converted to operating hours using the mean rotational speed.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["h", "min", "s"],
    range: { min: 0, unit: "s" },
  }),
  defineParameter({
    id: "screw.static_safety_factor",
    displayName: "Static safety factor",
    symbol: "fs",
    definition:
      "Computed static safety factor for a declared load case: fs = static load rating / applied axial load magnitude. Checked against screw.static_safety_factor_minimum.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    loadCases: screwCases,
  }),
  defineParameter({
    id: "screw.buckling_load",
    displayName: "Theoretical buckling load",
    symbol: "P_B",
    definition:
      "Unfactored theoretical (Euler column) buckling load of the screw shaft, before screw.buckling_safety_margin is applied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
  }),
  defineParameter({
    id: "screw.permissible_compressive_load",
    displayName: "Permissible compressive axial load",
    symbol: "F_perm_buck",
    definition:
      "screw.buckling_load multiplied by screw.buckling_safety_margin. Checked against the applied compressive axial load per declared load case.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    qualifiers: { bound: "allowable" },
    range: { min: 0, unit: "N" },
  }),
  defineParameter({
    id: "screw.critical_speed",
    displayName: "Theoretical critical (whip) speed",
    symbol: "n_k",
    definition:
      "Unfactored theoretical critical (whip) rotational speed of the screw shaft, before the fixed 0.8 operating margin is applied.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
  }),
  defineParameter({
    id: "screw.permissible_speed",
    displayName: "Permissible operating speed",
    symbol: "n_perm",
    definition:
      "screw.critical_speed multiplied by a fixed 0.8 operating margin (both Rockford Ball Screw and Steinmeyer agree on this figure — stage-1-spec.md item 8, unlike the buckling margin). Checked against the derived screw rotational speed.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    qualifiers: { bound: "allowable" },
    range: { min: 0, unit: "rad/s" },
  }),
];

/** All released parameter definitions for registry v1.3, in authored order. */
export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = [
  ...projectAndEnvironment,
  ...axisApplication,
  ...motionProfile,
  ...ballScrew,
];
