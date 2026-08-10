// Released seed definitions for the canonical parameter registry v1.8 (Units
// 1.3, 4.1 Stage 2, 4.2 Stage 2, 4.3 Stage 2, 4.4 Stage 2, 4.5 Stage 2,
// 4.6 Stage 2, and 4.7 Stage 2).
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
// (context/modules/ball-screw/stage-2-contract.md). v1.4 adds two axis-scope
// per-case vector outputs (resultant_force, resultant_moment) that
// axis-load-cases' own kernel already computes internally but did not yet
// expose as ports — added for linear-guide (Unit 4.4), which needs the full
// resolved force/moment vector at the guide reference point, not just the
// axial thrust-force scalar (context/modules/linear-guide/stage-1-spec.md
// "A Real, Already-Documented Dependency Gap"). v1.5 adds the full guide.*
// group for linear-guide (context/modules/linear-guide/stage-2-contract.md).
// v1.6 adds the full coupling.* group for the coupling module
// (context/modules/coupling/stage-2-contract.md). v1.7 adds the full
// bearing.* group for the support-bearing module
// (context/modules/support-bearing/stage-2-contract.md). v1.8 adds the full
// drive.* group for the servo drive-train module
// (context/modules/drive-train/stage-2-contract.md), the last of the five
// result groups context/implementation-map.md Unit 1.3 named as initial
// groups -- all five are now released.

import { makeQuantity } from "../units";
import { defineParameter } from "./define";
import type { ParameterDefinition } from "./types";

/** Semantic version of the released canonical parameter registry. */
export const PARAMETER_REGISTRY_VERSION = "1.8.0";

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
  defineParameter({
    id: "motion.axis.resultant_force",
    displayName: "Resultant applied force",
    symbol: "F_res",
    definition:
      "Full resolved force vector (all three axis.v1 components, not the axial scalar alone) applied to the moving assembly at the guide/carriage reference point, per load case: the sum of gravitational, friction, guide-resistance, and declared external force contributions. The friction and guide-resistance terms are purely axial (+/-X, opposing travel), so a consumer interested only in the transverse (Y, Z) load components is unaffected by them. Distinct from motion.axis.thrust_force, which reports only the signed +X (axial) drive demand as a scalar.",
    valueType: "vector_quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    frame: "axis",
    loadCases: ["normal", "peak", "holding", "emergency_stop"],
  }),
  defineParameter({
    id: "motion.axis.resultant_moment",
    displayName: "Resultant applied moment",
    symbol: "M_res",
    definition:
      "Full resolved moment vector (all three axis.v1 components) applied to the moving assembly at the guide/carriage reference point, per load case: the sum of the gravity-induced moment (center-of-mass offset cross gravitational force) and any declared external moment. A downstream module distributes this moment to individual guide blocks; this module resolves it but does not distribute it.",
    valueType: "vector_quantity",
    canonicalUnit: "N*m",
    displayUnits: ["N*m", "N*mm", "lbf*in"],
    frame: "axis",
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

// --- Linear guide (Unit 4.4 Stage 2) ----------------------------------------
// See context/modules/linear-guide/stage-2-contract.md. `linear-guide 0.1.0`
// computes the `normal`/`peak` cases only, matching axis-load-cases' own
// 0.1.0 scope restriction (the same reason screwCases above is two-valued).
//
// Deliberately not released here: a static/dynamic moment rating (PMI's
// M0/MP/MY/MR, IKO's T0/TX/TY). `0.1.0`'s equivalent-load form
// (PE = |PR| + |PT|, PMI's "two or more guideways" case) does not consume
// one — the moment is already expressed as differential per-block loading.
// A future single-rail ("mono rail") version would need it.

const guideCases = ["normal", "peak"] as const;
const lifeDistanceDisplay = ["km", "m"] as const;

const linearGuide: readonly ParameterDefinition[] = [
  defineParameter({
    id: "guide.rail_spacing",
    displayName: "Guide rail spacing",
    symbol: "l_r",
    definition:
      "Distance between the two parallel guide rails, measured perpendicular to the direction of travel. The lever arm over which a rolling moment (about the travel axis) is reacted by the two rails. This is PMI's own l2, not its l1 — the letters are easy to get backwards, and reproducing PMI's Chapter 9 worked example is what settled which is which (lib/modules/linear-guide/0.1.0/pmi-chapter-9.ts).",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.block_spacing",
    displayName: "Guide block spacing",
    symbol: "l_b",
    definition:
      "Distance between the two blocks/carriages mounted on one rail, measured along the direction of travel. The lever arm over which both a pitching moment (reacted radially) and a yawing moment (reacted laterally) are carried by the fore and aft carriage pairs. This is PMI's own l1, not its l2 — see guide.rail_spacing.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.static_load_rating",
    displayName: "Guide basic static load rating",
    symbol: "C0",
    definition:
      "Basic static load rating of one guide block from the specific guide's own catalog data: the static load at which the sum of permanent deformation between raceway and rolling element reaches 0.0001 times the rolling-element diameter at the most-stressed contact point. IKO states this complies with ISO 14728-2; PMI describes the identical criterion without citing ISO by number.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.dynamic_load_rating",
    displayName: "Guide basic dynamic load rating",
    symbol: "C",
    definition:
      "Basic dynamic load rating of one guide block from the specific guide's own catalog data, used by the nominal-life formula. Unlike a ball screw's rating (see screw.dynamic_load_rating_basis), a linear-guide rating has no basis ambiguity: PMI and IKO both express rolling-guide life as travel distance, so no revolutions/distance qualifier parameter is needed.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.rolling_element_type",
    displayName: "Guide rolling-element type",
    symbol: "elem",
    definition:
      "Rolling-element type of the guide, which selects the life-formula exponent and distance basis: ball (e = 3, 50 km basis) or roller (e = 10/3, 100 km basis). Both PMI and IKO publish both branches; a released module version may implement only one of them.",
    valueType: "enum",
    enumId: "guide_rolling_element_type",
    enumOptions: ["ball", "roller"],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.preload_grade",
    displayName: "Guide preload grade",
    symbol: "pre",
    definition:
      "Preload/clearance grade the specific candidate guide carries (PMI's FZ clearance, FC light, F0 medium, F1 heavy, F2 ultra-heavy). A catalog/selection fact the engineer supplies, not a value a module derives, and reported rather than evaluated pass/fail.",
    valueType: "enum",
    enumId: "guide_preload_grade",
    enumOptions: ["clearance", "light", "medium", "heavy", "ultra_heavy"],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.load_factor",
    displayName: "Guide load factor",
    symbol: "fW",
    definition:
      "Load (speed/impact) correction factor applied to the guide life formula, PMI's and IKO's fW. Required with no built-in default: both sources publish a speed- and impact-keyed guidance range (PMI 1.0-1.2 smooth through 2.0-3.5 strong impact; IKO 1-1.2 smooth through 1.5-3 shock) rather than a single confirmed constant.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.hardness_factor",
    displayName: "Guide hardness factor",
    symbol: "fH",
    definition:
      "Raceway-hardness correction factor applied to the guide life formula, PMI's fH. Defaults to 1.0, which is a statement about the guide's construction rather than a guessed physical value: PMI states its own guideways meet the reference raceway hardness, so the factor only departs from 1.0 for a softer non-catalog raceway.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(1, "ratio") },
  }),
  defineParameter({
    id: "guide.temperature_factor",
    displayName: "Guide temperature factor",
    symbol: "fT",
    definition:
      "Operating-temperature correction factor applied to the guide life formula, PMI's fT. Defaults to 1.0, the value PMI's own table gives at or below the 100 degC reference condition; it degrades only above that.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(1, "ratio") },
  }),
  defineParameter({
    id: "guide.static_safety_factor_minimum",
    displayName: "Minimum required guide static safety factor",
    symbol: "fs_min",
    definition:
      "Minimum acceptable static safety factor (fs = C0 / equivalent static load) the engineer requires for this application, supplied explicitly rather than assumed by the module. Both sources publish a standard-values table but they disagree on the ranges (PMI 1.0-1.3 normal / 2.0-3.0 impact for a regular industrial machine; IKO 1-3 normal / 3-5 with vibration and shock for a ball-type Linear Way), so neither is adopted as a built-in default — the same treatment screw.static_safety_factor_minimum received.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "guide.equivalent_load",
    displayName: "Guide equivalent load",
    symbol: "PE",
    definition:
      "Equivalent load on the governing (most heavily loaded) guide block for a declared load case, per PMI's two-or-more-guideways form PE = |PR| + |PT|. No separate moment term is added: in a two-rail arrangement the moment is already expressed as differential loading between blocks. Per-block detail is reported in the calculation trace, not on this port.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "required" },
    loadCases: guideCases,
  }),
  defineParameter({
    id: "guide.static_safety_factor",
    displayName: "Guide static safety factor",
    symbol: "fs",
    definition:
      "Computed static safety factor of the governing guide block for a declared load case: fs = guide.static_load_rating / guide.equivalent_load. Checked against guide.static_safety_factor_minimum.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    loadCases: guideCases,
  }),
  defineParameter({
    id: "guide.nominal_life",
    displayName: "Guide nominal life",
    symbol: "L",
    definition:
      "Nominal (rated) life of the governing guide block for a declared load case, expressed as travel distance rather than revolutions — the basis both PMI and IKO publish for rolling guides, matching how a guide physically wears. Stored canonically in metres and displayed in km (the unit both catalogs print), the same canonical-SI/convenient-display split screw.nominal_life_hours uses.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lifeDistanceDisplay],
    range: { min: 0, unit: "m" },
    loadCases: guideCases,
  }),
];

// --- Coupling (Unit 4.5 Stage 2) --------------------------------------------
// See context/modules/coupling/stage-2-contract.md. `coupling 0.1.0`
// computes the `normal`/`peak` cases only, matching axis-load-cases' and
// ball-screw's own 0.1.0 scope restriction (the same reason screwCases and
// guideCases above are two-valued): `normal` is checked as the steady-torque
// case (KTR's T_N / R+W's T_AN), `peak` as the shock-torque case (KTR's
// T_S / R+W's T_AS) — a documented adaptation, since axis-load-cases' own
// "peak" case means a peak *operating* condition, not a motor's electrical
// starting-torque transient the source catalogs actually mean by that term
// (stage-1-spec.md "Checks (Proposed)").
//
// Deliberately not released here: a torsional-resonance/inertia group
// (R+W's own f_e formula, stage-1-spec.md item 3) — this project has no
// released motor-rotor or reflected-load inertia parameter yet (Unit 4.7
// territory), so there is nothing for it to consume. KTR's and R+W's own
// disagreeing, multi-page application-type factor tables (operating/shock,
// temperature, starting, direction) are also not reproduced as registry
// enums or lookup tables — coupling.service_factor below is one consolidated
// required input instead, the same "required input, both sources' ranges
// recorded as reference text, neither table adopted wholesale" treatment
// guide.static_safety_factor_minimum already received.

const couplingCases = ["normal", "peak"] as const;
const torqueDisplay = ["N*m", "N*mm", "lbf*in"] as const;
const torsionalStiffnessDisplay = ["N*m/rad"] as const;
const inertiaDisplay = ["kg*m^2", "kg*cm^2", "g*cm^2"] as const;

const coupling: readonly ParameterDefinition[] = [
  defineParameter({
    id: "coupling.rated_torque",
    displayName: "Coupling rated torque",
    symbol: "T_KN",
    definition:
      "Torque the candidate coupling can transmit continuously over its full permissible speed range, from its own catalog data. Checked against the steady-state (normal-case) required torque, scaled by coupling.service_factor.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.max_torque",
    displayName: "Coupling maximum torque",
    symbol: "T_Kmax",
    definition:
      "Maximum (shock/momentary) torque the candidate coupling can withstand over its operating life, from its own catalog data. Checked against the peak-case required torque, scaled by coupling.service_factor.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.allowable_speed",
    displayName: "Coupling allowable rotational speed",
    symbol: "n_max",
    definition:
      "Maximum rotational speed the candidate coupling's own catalog data permits.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.torsional_stiffness",
    displayName: "Coupling torsional stiffness",
    symbol: "C_T",
    definition:
      "Torsional stiffness of the candidate coupling, from its own catalog data. Reported, not evaluated pass/fail in 0.1.0 — R+W's own resonant-frequency check (stage-1-spec.md item 3) that would consume this needs a motor/load inertia input this project does not release yet.",
    valueType: "quantity",
    canonicalUnit: "N*m/rad",
    displayUnits: [...torsionalStiffnessDisplay],
    range: { min: 0, unit: "N*m/rad" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.moment_of_inertia",
    displayName: "Coupling moment of inertia",
    symbol: "J_C",
    definition:
      "Mass moment of inertia of the candidate coupling about its rotational axis, from its own catalog data. Reported, not evaluated pass/fail in 0.1.0 — a future drive-train module (Unit 4.7) may consume this for an inertia-ratio check.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.driving_bore_min",
    displayName: "Coupling driving-side minimum bore",
    symbol: "d1_min",
    definition:
      "Smallest driving-side (motor-side) shaft diameter the candidate coupling's own catalog bore range accepts.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.driving_bore_max",
    displayName: "Coupling driving-side maximum bore",
    symbol: "d1_max",
    definition:
      "Largest driving-side (motor-side) shaft diameter the candidate coupling's own catalog bore range accepts.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.driven_bore_min",
    displayName: "Coupling driven-side minimum bore",
    symbol: "d2_min",
    definition:
      "Smallest driven-side (load-side) shaft diameter the candidate coupling's own catalog bore range accepts.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.driven_bore_max",
    displayName: "Coupling driven-side maximum bore",
    symbol: "d2_max",
    definition:
      "Largest driven-side (load-side) shaft diameter the candidate coupling's own catalog bore range accepts.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.allowable_parallel_misalignment",
    displayName: "Coupling allowable parallel misalignment",
    symbol: "dK_par_allow",
    definition:
      "Maximum parallel (radial offset) shaft misalignment the candidate coupling's own catalog data permits.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.allowable_angular_misalignment",
    displayName: "Coupling allowable angular misalignment",
    symbol: "dK_ang_allow",
    definition:
      "Maximum angular shaft misalignment the candidate coupling's own catalog data permits.",
    valueType: "quantity",
    canonicalUnit: "rad",
    displayUnits: ["deg", "rad"],
    range: { min: 0, unit: "deg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.allowable_axial_misalignment",
    displayName: "Coupling allowable axial misalignment",
    symbol: "dK_ax_allow",
    definition:
      "Maximum axial (end-play) shaft misalignment the candidate coupling's own catalog data permits.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.actual_parallel_misalignment",
    displayName: "Actual parallel misalignment",
    symbol: "dK_par",
    definition:
      "Parallel (radial offset) shaft misalignment of the actual installation, engineer-supplied. Checked against coupling.allowable_parallel_misalignment.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.actual_angular_misalignment",
    displayName: "Actual angular misalignment",
    symbol: "dK_ang",
    definition:
      "Angular shaft misalignment of the actual installation, engineer-supplied. Checked against coupling.allowable_angular_misalignment.",
    valueType: "quantity",
    canonicalUnit: "rad",
    displayUnits: ["deg", "rad"],
    range: { min: 0, unit: "deg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.actual_axial_misalignment",
    displayName: "Actual axial misalignment",
    symbol: "dK_ax",
    definition:
      "Axial (end-play) shaft misalignment of the actual installation, engineer-supplied. Checked against coupling.allowable_axial_misalignment.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.driving_shaft_diameter",
    displayName: "Driving shaft diameter",
    symbol: "d1",
    definition:
      "Actual diameter of the driving-side (motor-side) shaft, engineer-supplied. Checked against coupling.driving_bore_min/coupling.driving_bore_max.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.driven_shaft_diameter",
    displayName: "Driven shaft diameter",
    symbol: "d2",
    definition:
      "Actual diameter of the driven-side (load-side) shaft, engineer-supplied. Checked against coupling.driven_bore_min/coupling.driven_bore_max.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.service_factor",
    displayName: "Coupling service factor",
    symbol: "S",
    definition:
      "Consolidated correction factor scaling the required torque before it is checked against coupling.rated_torque/coupling.max_torque. KTR and R+W each publish their own operating/shock, temperature, starting, and direction factor tables (context/modules/coupling/stage-1-spec.md item 2) that disagree in category boundaries and numeric ranges; neither table is adopted wholesale, so this is one required input the engineer sets from their own project/company policy or the source tables directly, the same treatment guide.static_safety_factor_minimum received. Applied identically to both the normal (steady) and peak (shock) load cases — a documented simplification, since both sources actually use a different named factor for each check.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "coupling.torque_safety_factor",
    displayName: "Coupling torque safety factor",
    symbol: "fs_T",
    definition:
      "Computed torque safety margin for a declared load case: the coupling's own rated torque (normal case) or maximum torque (peak case) divided by the required torque (screw.drive_torque for that case) times coupling.service_factor.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    loadCases: couplingCases,
  }),
  defineParameter({
    id: "coupling.speed_safety_factor",
    displayName: "Coupling speed safety factor",
    symbol: "fs_n",
    definition:
      "Computed speed margin for a declared load case: coupling.allowable_speed divided by the operating rotational speed for that case, derived from motion.axis.case_linear_velocity via screw.lead and screw.gear_ratio (stage-2-contract.md 'Decisions').",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    loadCases: couplingCases,
  }),
];

// --- Support bearing (Unit 4.6 Stage 2) -------------------------------------
// See context/modules/support-bearing/stage-2-contract.md. `support-bearing
// 0.1.0` models one support bearing per calculation run (the fixed-side
// angular contact bearing, or the supported/floating-side deep-groove
// bearing — bearing.location selects which), matching the same "one
// candidate component, engineer identifies it by model" scope every other
// Milestone 4 module uses. Reuses motion.axis.thrust_force (per case,
// already ball-screw 0.1.0's own input) directly for the fixed-side
// bearing's axial load rather than asking ball-screw to expose a new
// output port -- the roadmap's own Unit 4.6 gate ("Support-bearing output
// integrates with the ball-screw module without a custom link mapping",
// context/implementation-map.md). Radial load has no clean upstream source
// (stage-1-spec.md "Evidence Gaps") and is a new required engineer-supplied
// input instead (bearing.actual_radial_load below), the same "no upstream
// signal exists, so the engineer supplies it directly" treatment
// coupling.actual_parallel_misalignment already received.
//
// Deliberately not released here: a fit-tolerance-class (h6/k5/js5, etc.)
// compatibility check -- a support bearing's bore is manufactured to match
// one specific shaft diameter, not a clamping range the way
// coupling.driving_bore_min/max is, so bearing.bore_diameter and
// bearing.outside_diameter below are reported catalog values only, not
// evaluated against an actual shaft/housing diameter in 0.1.0 (a real scope
// narrowing from stage-1-spec.md's own initial "simple bound check"
// proposal -- see stage-2-contract.md "Decisions"). bearing.preload is
// likewise reported only, not evaluated -- no source read gives a pass/fail
// criterion for it (stage-1-spec.md item 4).

const bearingCases = ["normal", "peak"] as const;
const bearingLocations = ["fixed", "supported"] as const;
const lifeDistanceOrHoursDisplay = ["h", "min", "s"] as const;

const supportBearing: readonly ParameterDefinition[] = [
  defineParameter({
    id: "bearing.location",
    displayName: "Support bearing location",
    symbol: "loc",
    definition:
      "Which of the axis's two support-bearing locations this calculation represents: the fixed side (an angular contact bearing reacting both axial and radial load) or the supported/floating side (a deep-groove bearing reacting radial load only, matching THK's own Support Unit structure -- stage-1-spec.md item 'Candidate Sources'). Determines which checks apply: the axial-load and dynamic-equivalent-load-factor-Y ports are not meaningful for a 'supported' location bearing (stage-2-contract.md 'Decisions' item 1).",
    valueType: "enum",
    enumId: "bearing_location",
    enumOptions: [...bearingLocations],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.dynamic_load_rating",
    displayName: "Basic dynamic load rating",
    symbol: "C",
    definition:
      "Basic dynamic load rating from the specific support bearing's own catalog data (Ca for an angular contact bearing, C for a deep-groove bearing -- THK's own catalog dimension table). Used by the basic rating life formula.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.static_load_rating",
    displayName: "Basic static load rating",
    symbol: "C0",
    definition:
      "Basic static load rating from the specific support bearing's own catalog data. Checked against the static equivalent load via bearing.static_safety_factor_minimum.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.allowable_speed",
    displayName: "Support bearing allowable rotational speed",
    symbol: "n_max",
    definition:
      "Maximum rotational speed the candidate support bearing's own catalog data permits.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.dynamic_load_factor_x",
    displayName: "Dynamic equivalent load radial factor",
    symbol: "X",
    definition:
      "Radial-load factor for the dynamic equivalent load formula (P = X*Fr + Y*Fa), from the specific bearing's own catalog dimensions table -- bearing-model-specific, not a universal table (jp.ntn.rolling_bearings_handbook 'the values of X and Y are given in the dimensions table of the catalog').",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.dynamic_load_factor_y",
    displayName: "Dynamic equivalent load axial factor",
    symbol: "Y",
    definition:
      "Axial-load factor for the dynamic equivalent load formula (P = X*Fr + Y*Fa), from the specific bearing's own catalog dimensions table. Not meaningful for a bearing.location = 'supported' calculation (stage-2-contract.md 'Decisions' item 1).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.static_load_factor_x",
    displayName: "Static equivalent load radial factor",
    symbol: "X0",
    definition:
      "Radial-load factor for the static equivalent load formula (P0 = X0*Fr + Y0*Fa), from the specific bearing's own catalog dimensions table.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.static_load_factor_y",
    displayName: "Static equivalent load axial factor",
    symbol: "Y0",
    definition:
      "Axial-load factor for the static equivalent load formula (P0 = X0*Fr + Y0*Fa), from the specific bearing's own catalog dimensions table. Not meaningful for a bearing.location = 'supported' calculation.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.bore_diameter",
    displayName: "Support bearing bore diameter",
    symbol: "d",
    definition:
      "Inner (bore) diameter from the specific support bearing's own catalog data. Reported only in 0.1.0, not evaluated against an actual shaft diameter -- a support bearing's bore is manufactured to one specific matched shaft diameter, not a clamping range (stage-2-contract.md 'Decisions').",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.outside_diameter",
    displayName: "Support bearing outside diameter",
    symbol: "D",
    definition:
      "Outer diameter from the specific support bearing's own catalog data. Reported only in 0.1.0, for the same reason bearing.bore_diameter is.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.preload",
    displayName: "Support bearing preload",
    symbol: "F0",
    definition:
      "Factory-set preload of the candidate support bearing, from its own catalog data where the manufacturer publishes it (THK's own fixed-side angular contact bearing ships with 'an adjusted preload' -- stage-1-spec.md item 4). Reported only; no source read gives a pass/fail criterion for preload amount.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "optional" },
  }),
  defineParameter({
    id: "bearing.static_safety_factor_minimum",
    displayName: "Minimum required static safety factor",
    symbol: "S0_min",
    definition:
      "Minimum acceptable bearing.static_safety_factor for this axis/application, engineer-supplied with no built-in default. jp.ntn.rolling_bearings_handbook Table 6.4 gives lower-limit reference values by operating condition and bearing type (ball bearings: 2 for 'high rolling precision required', 1 for 'normal rolling precision required'), but only one source's own numbers were read this session -- the same 'required input, no built-in default' treatment screw.static_safety_factor_minimum, guide.static_safety_factor_minimum, and coupling.service_factor already received, extended here even without a second source's own disagreeing numbers to record (stage-2-contract.md 'Decisions' item 5).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.actual_radial_load",
    displayName: "Actual radial load",
    symbol: "Fr",
    definition:
      "Actual radial load on the candidate support bearing for a declared load case, engineer-supplied -- no released upstream parameter cleanly represents it (unlike axial load, which reuses motion.axis.thrust_force directly). See stage-2-contract.md 'Decisions' item 2 and stage-1-spec.md 'Evidence Gaps'.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    loadCases: bearingCases,
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "bearing.dynamic_equivalent_load",
    displayName: "Support bearing dynamic equivalent load",
    symbol: "P",
    definition:
      "Computed dynamic equivalent load for a declared load case: P = X*Fr + Y*Fa (jp.ntn.rolling_bearings_handbook eq. 7.10), using bearing.dynamic_load_factor_x/y, bearing.actual_radial_load, and (for a fixed-location bearing) motion.axis.thrust_force.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    loadCases: bearingCases,
  }),
  defineParameter({
    id: "bearing.nominal_life",
    displayName: "Support bearing nominal (L10) fatigue life",
    symbol: "L10",
    definition:
      "Nominal (L10) fatigue life in revolutions for a declared load case: the life expected to be reached by 90% of a sufficiently large number of identical bearings at the given dynamic load rating under the dynamic equivalent load (jp.ntn.rolling_bearings_handbook eq. 6.1).",
    valueType: "quantity",
    canonicalUnit: "rev",
    displayUnits: ["rev"],
    range: { min: 0, unit: "rev" },
    loadCases: bearingCases,
  }),
  defineParameter({
    id: "bearing.nominal_life_hours",
    displayName: "Support bearing nominal (L10) fatigue life in hours",
    symbol: "L10h",
    definition:
      "bearing.nominal_life converted to operating hours using the case rotational speed (jp.ntn.rolling_bearings_handbook eq. 6.2).",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: [...lifeDistanceOrHoursDisplay],
    range: { min: 0, unit: "s" },
    loadCases: bearingCases,
  }),
  defineParameter({
    id: "bearing.static_safety_factor",
    displayName: "Support bearing static safety factor",
    symbol: "S0",
    definition:
      "Computed static safety factor for a declared load case: bearing.static_load_rating divided by the static equivalent load (P0 = X0*Fr + Y0*Fa). Checked against bearing.static_safety_factor_minimum.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    loadCases: bearingCases,
  }),
  defineParameter({
    id: "bearing.speed_safety_factor",
    displayName: "Support bearing speed safety factor",
    symbol: "fs_n",
    definition:
      "Computed speed margin for a declared load case: bearing.allowable_speed (with jp.ntn.rolling_bearings_handbook's own fL/fC correction applied when triggered) divided by the operating rotational speed for that case, derived from screw.lead and motion.axis.case_linear_velocity.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    loadCases: bearingCases,
  }),
];

// --- Servo drive-train (Unit 4.7 Stage 2) -----------------------------------
// See context/modules/drive-train/stage-2-contract.md. `drive-train 0.1.0`
// sizes one candidate servo motor (plus, optionally, a gearbox already
// modeled via screw.gear_ratio, a drive's own regenerative-energy absorption
// capacity, and a holding brake's own rated torque, both reported/checked
// only when supplied) against the axis's own required torque, speed, and
// duty cycle. Reuses screw.gear_ratio directly rather than adding a
// duplicate drive.gear_ratio (stage-2-contract.md "Decisions" item 2), and
// consumes motion.profile.rms_acceleration under a closed-cycle argument
// stated and reserved for Stage 4 verification (item 4). The RMS-torque
// margin, peak-torque margin, and maximum inertia ratio are required inputs
// with no built-in default -- stage-1-spec.md found a three-way and a
// five-way sourced disagreement respectively, sharper than any prior
// module's own factor-table mismatch.
//
// drive.gearbox_efficiency is deliberately distinct from screw.mechanical_
// efficiency: the latter is the ball screw's own internal efficiency,
// already applied inside screw.drive_torque; the former is a gearbox's own
// transmission efficiency, which ball-screw 0.1.0's own released kernel
// does not model (a real gap stage-1-spec.md found by reading the kernel,
// not invented) -- this module applies it as its own additional derating on
// top of screw.drive_torque rather than editing the released ball-screw
// kernel (stage-2-contract.md "Decisions" item 5).

const driveCases = ["normal", "peak"] as const;

const driveTrain: readonly ParameterDefinition[] = [
  defineParameter({
    id: "drive.motor_rated_torque",
    displayName: "Motor rated (continuous) torque",
    symbol: "T_M",
    definition:
      "Torque the candidate servo motor can sustain continuously, from its own catalog data. Checked against drive.effective_torque, scaled by drive.rms_torque_margin.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.motor_peak_torque",
    displayName: "Motor peak (maximum momentary) torque",
    symbol: "T_Mmax",
    definition:
      "Peak (maximum momentary) torque the candidate servo motor can deliver, from its own catalog data. Checked against drive.momentary_torque, scaled by drive.peak_torque_margin.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.motor_rated_speed",
    displayName: "Motor rated rotational speed",
    symbol: "N_rated",
    definition:
      "Rated rotational speed of the candidate servo motor, from its own catalog data. Checked against drive.operating_speed.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.motor_rotor_inertia",
    displayName: "Motor rotor moment of inertia",
    symbol: "J_M",
    definition:
      "Rotor moment of inertia of the candidate servo motor, from its own catalog data. Used by drive.total_system_inertia and drive.inertia_ratio.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.gearbox_efficiency",
    displayName: "Gearbox transmission efficiency",
    symbol: "eta_g",
    definition:
      "Transmission efficiency of the gearbox declared via screw.gear_ratio (source: typically 0.6-0.98 depending on gearbox family -- stage-1-spec.md item 7). Distinct from screw.mechanical_efficiency, the ball screw's own internal efficiency, already applied inside screw.drive_torque. Optional at the registry level; the package's own input schema requires it whenever screw.gear_ratio != 1, and treats it as exactly 1 (no additional derating) only when screw.gear_ratio = 1 -- a structural fact stated in code, not a registry default (stage-2-contract.md 'Decisions' item 5).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "optional" },
  }),
  defineParameter({
    id: "drive.regen_absorption_capacity",
    displayName: "Drive regenerative energy absorption capacity",
    symbol: "E_abs",
    definition:
      "Regenerative energy absorption capacity of the candidate drive (built-in capacitance plus any regenerative resistor), from its own catalog data. Optional -- when absent, the regenerative-energy check reports not_applicable rather than failing or guessing a capacity (stage-2-contract.md 'Decisions' item 6).",
    valueType: "quantity",
    canonicalUnit: "J",
    displayUnits: ["J"],
    range: { min: 0, unit: "J" },
    defaultPolicy: { kind: "optional" },
  }),
  defineParameter({
    id: "drive.brake_rated_torque",
    displayName: "Holding brake rated static torque",
    symbol: "T_brake",
    definition:
      "Rated static holding torque of the candidate holding brake, from its own catalog data. Reported only in 0.1.0, not evaluated -- no source read this session gives a standalone catalog-comparison formula for a holding brake; every source that treats one at all folds its effect into drive.effective_torque's own duty-cycle formula instead (stage-1-spec.md item 9).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    defaultPolicy: { kind: "optional" },
  }),
  defineParameter({
    id: "drive.rms_torque_margin",
    displayName: "RMS torque safety margin",
    symbol: "k_rms",
    definition:
      "Allowed fraction of drive.motor_rated_torque the computed drive.effective_torque may reach, engineer-supplied with no built-in default. Sources disagree: Omron's own worked example uses a flat 0.8; Oriental Motor's own blog recommends an 'effective load safety factor' of 1.5-2 applied the opposite way (Trms/T_M >= 1.5, equivalent to an allowed fraction of 0.5-0.667); HMK and Voss state no margin for this specific check (stage-1-spec.md item 3). Kept separate from drive.peak_torque_margin -- see stage-2-contract.md 'Decisions' item 3 for why.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.peak_torque_margin",
    displayName: "Peak torque safety margin",
    symbol: "k_peak",
    definition:
      "Allowed fraction of drive.motor_peak_torque the computed drive.momentary_torque may reach, engineer-supplied with no built-in default -- the same sourced disagreement drive.rms_torque_margin has (stage-1-spec.md item 4). Kept separate from drive.rms_torque_margin -- see stage-2-contract.md 'Decisions' item 3.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable drive.inertia_ratio, engineer-supplied with no built-in default. stage-1-spec.md item 5 found five sourced, disagreeing conventions spanning 2:1 to 100:1 depending on control technology, tuning method, and positioning objective -- sharper than any prior module's own factor disagreement in this project, and Omron's own worked-example figure is itself a per-motor-series catalog value, not a universal constant.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.reflected_load_inertia",
    displayName: "Load inertia reflected to the motor shaft",
    symbol: "J_L",
    definition:
      "Load-side moment of inertia (ball screw, coupling, and payload combined), already reflected to the motor shaft through any gearbox ratio (reflected inertia divides by the gear ratio squared -- stage-1-spec.md item 2). Engineer-supplied, required, no default: this project has no released ball-screw-inertia or payload-inertia-conversion parameter to derive it from internally -- a real gap found while wiring Stage 3, not carried over from stage-2-contract.md's own original (output) framing -- so it receives the same 'no upstream signal exists, so the engineer supplies it directly' treatment bearing.actual_radial_load already received. Used by drive.total_system_inertia and drive.inertia_ratio.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "drive.total_system_inertia",
    displayName: "Total system inertia",
    symbol: "J_total",
    definition:
      "drive.motor_rotor_inertia + drive.reflected_load_inertia. Used by drive.acceleration_torque and drive.inertia_ratio.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "drive.inertia_ratio",
    displayName: "Load-to-rotor inertia ratio",
    symbol: "R_J",
    definition:
      "drive.reflected_load_inertia / drive.motor_rotor_inertia. Checked against drive.inertia_ratio_maximum.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
  }),
  defineParameter({
    id: "drive.operating_speed",
    displayName: "Motor-shaft operating speed",
    symbol: "N_op",
    definition:
      "Motor-shaft rotational speed for a declared load case, derived from motion.axis.case_linear_velocity, screw.lead, and screw.gear_ratio -- the same derivation coupling 0.1.0 already resolved for its own driving-shaft speed. Checked against drive.motor_rated_speed.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
    loadCases: driveCases,
  }),
  defineParameter({
    id: "drive.acceleration_torque",
    displayName: "Acceleration/deceleration torque",
    symbol: "T_A",
    definition:
      "Torque to accelerate/decelerate drive.total_system_inertia at the larger-magnitude of motion.profile.peak_acceleration/motion.profile.peak_deceleration, per Omron's, HMK's, and Voss's own agreed T = J*alpha formula (stage-1-spec.md item 2). Not load-case-scoped: neither motion.profile's own acceleration outputs nor drive.total_system_inertia vary by load case in this project's model, unlike drive.momentary_torque and drive.effective_torque, which combine this shared figure with a per-case screw.drive_torque.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "drive.momentary_torque",
    displayName: "Maximum momentary torque",
    symbol: "T_1",
    definition:
      "Highest single-phase motor-shaft torque for a declared load case: drive.acceleration_torque plus the gearbox-derated screw.drive_torque (screw.drive_torque / drive.gearbox_efficiency when a gearbox is declared -- stage-2-contract.md 'Decisions' item 5), following Omron's own T1 = T_A + T_L. Checked against drive.motor_peak_torque * drive.peak_torque_margin.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "peak" },
    loadCases: driveCases,
  }),
  defineParameter({
    id: "drive.effective_torque",
    displayName: "Effective (RMS) torque",
    symbol: "T_rms",
    definition:
      "RMS torque over one motion cycle for a declared load case, from motion.profile.rms_acceleration (the inertial component) and the gearbox-derated screw.drive_torque (the constant load-torque component), under the closed-cycle argument recorded in stage-2-contract.md 'Decisions' item 4: Trms^2 = (J_total/k)^2*a_rms^2 + T_load^2, valid when total system inertia and per-case load torque both stay constant across a cycle that returns to its starting velocity. Checked against drive.motor_rated_torque * drive.rms_torque_margin.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "rms" },
    loadCases: driveCases,
  }),
  defineParameter({
    id: "drive.regen_energy_released",
    displayName: "Regenerative energy released",
    symbol: "E_regen",
    definition:
      "Kinetic energy released during the case's own deceleration phase(s): E = J_total*(omega_1^2 - omega_2^2)/2, assuming (per Celera Motion's own stated simplifying assumption, stage-1-spec.md item 10) 100% of this energy reaches the drive's own absorption path -- no drive-electronics efficiency loss or DC-bus capacitor-absorption credit is modeled. Checked against drive.regen_absorption_capacity when supplied; reports not_applicable otherwise (stage-2-contract.md 'Decisions' item 6).",
    valueType: "quantity",
    canonicalUnit: "J",
    displayUnits: ["J"],
    range: { min: 0, unit: "J" },
    qualifiers: { bound: "required" },
    loadCases: driveCases,
  }),
];

/** All released parameter definitions for registry v1.8, in authored order. */
export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = [
  ...projectAndEnvironment,
  ...axisApplication,
  ...motionProfile,
  ...ballScrew,
  ...linearGuide,
  ...coupling,
  ...supportBearing,
  ...driveTrain,
];
