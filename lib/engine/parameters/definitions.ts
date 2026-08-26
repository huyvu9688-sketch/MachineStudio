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
// groups -- all five are now released. v1.9 adds the full
// motor_sizing.ball_screw.* group for the ball-screw-motor-sizing module
// (context/modules/ball-screw-motor-sizing/stage-2-contract.md), the first
// module in the new Motor Sizing Tool family (ADR-0011, Milestone 6). This
// module is self-contained: it reproduces, rather than links to, the
// physics already released in axis-load-cases, ball-screw, motion-profile,
// and drive-train, and reuses only screw.lead, screw.gear_ratio,
// screw.preload, screw.internal_friction_coefficient,
// screw.mechanical_efficiency, and the motion.axis.* orientation/mass/
// friction/gravity group directly. Its own motion inputs use distinct
// forward_*/return_* parameter IDs rather than an indexed shared-ID family,
// deliberately avoiding motion-profile's own move_{1..5}_* port-resolution
// defect (context/progress-tracker.md "Open decisions"). v1.10 adds the
// full motor_sizing.direct_drive_conveyor.* group for the
// direct-drive-conveyor-motor-sizing module (context/modules/
// direct-drive-conveyor-motor-sizing/stage-2-contract.md), the second
// Motor Sizing Tool family module. Also self-contained; reuses only
// motion.axis.gravity. Its own belt_friction_coefficient is a deliberately
// new parameter, not a reuse of motion.axis.friction_coefficient (a
// different physical interface with a different typical value). Scoped to
// a single acceleration event (no deceleration phase, no RMS torque check)
// and has no gear-ratio parameter at all -- narrower scope decisions than
// motor_sizing.ball_screw.*'s own, recorded in the module's own Stage 2
// contract "Decisions".
//
// v1.11 added the full motor_sizing.rack_pinion.* group; v1.12 added the
// full motor_sizing.belt_pulley.* group (0.1.0); v1.13 added the full
// motor_sizing.index_table.* group -- see each module's own
// stage-2-contract.md for the full account.
//
// v1.14 adds 8 new motor_sizing.belt_pulley.* parameters (motion_mode,
// deceleration_time, dwell_time, constant_velocity_time, cycle_time,
// travel_distance, deceleration_torque, effective_torque) for the
// belt-pulley-drive-motor-sizing 0.2.0 release (context/modules/
// belt-pulley-drive-motor-sizing/stage-2-contract.md "0.2.0 Addendum") --
// the first module-version bump in this project. Additive only; none of
// the 24 parameters 1.12.0 already released for this module's own 0.1.0
// are edited.
//
// v1.15 adds one new parameter per Motor Sizing mechanism --
// motor_sizing.<mechanism>.inertia_ratio_recommended_maximum (ball_screw,
// direct_drive_conveyor, rack_pinion, belt_pulley, index_table) -- a
// sibling of each mechanism's own existing *.inertia_ratio_maximum
// (required, no default, unedited and unaffected by this release). Each
// new parameter carries a founder-directed default of 10, disclosed in its
// own definition text as founder judgment, not a manufacturer-sourced
// figure -- a deliberate, disclosed departure from this project's usual
// evidence bar for a numeric default, matching drive-train/stage-1-spec.md
// item 5's own finding that five sources disagree on this exact ratio (2:1
// to 100:1). See docs/superpowers/specs/
// 2026-08-18-motor-sizing-consistency-pass-design.md "Inertia-ratio
// recommended default" for the full account.
//
// v1.16 adds the full pneumatic.* group (22 parameters) for the
// pneumatic-cylinder module (context/modules/pneumatic-cylinder/
// stage-2-contract.md), Milestone 7's first module -- a new, standalone
// family, not part of linear-axis@1 or the Motor Sizing Tool family. Adds
// two new unit-registry dimensions (volume, volumetricFlowRate;
// lib/engine/units/registry.ts) for the reported (not evaluated) air-
// consumption/required-air-volume outputs -- no prior module needed
// either.
//
// v1.17 adds the full pneumatic_sizing.* group (4 new parameters) for the
// pneumatic-cylinder-sizing module (context/modules/pneumatic-cylinder-
// sizing/stage-2-contract.md), Milestone 7's second module. Reuses ten
// existing parameters directly (motion.axis.incline_angle,
// motion.axis.friction_coefficient, motion.axis.total_moving_mass,
// pneumatic.operating_pressure, pneumatic.load_factor,
// pneumatic.cushion_type, pneumatic.mounting_style,
// pneumatic.buckling_safety_factor, pneumatic.max_piston_speed,
// pneumatic.kinetic_energy) rather than minting duplicates -- see
// stage-2-contract.md "Existing Parameter Review". No new unit-registry
// dimension or unit is needed.
//
// v1.19 adds the full dual_rod_sizing.* group (6 new parameters) for the
// dual-rod-cylinder-sizing module (context/modules/
// dual-rod-cylinder-sizing/stage-2-contract.md), Milestone 7's fourth
// module and the second of four planned new pneumatic actuator families
// (dual rod; docs/superpowers/specs/
// 2026-08-26-dual-rod-cylinder-sizing-design.md). Reuses the same base
// trio and pneumatic ports pneumatic_sizing.*/pneumatic_guided_sizing.*
// already reuse; mints new IDs rather than reusing either sibling
// module's own analogous parameters. No pneumatic.mounting_style or
// pneumatic.buckling_safety_factor port -- this module has no buckling
// check, the one genuine port-level scope difference from both sibling
// modules.
//
// v1.18 adds the full pneumatic_guided_sizing.* group (8 new parameters)
// for the guided-cylinder-sizing module (context/modules/
// guided-cylinder-sizing/stage-2-contract.md), Milestone 7's third module
// and the first of four planned new pneumatic actuator families (guided
// cylinder; docs/superpowers/specs/
// 2026-08-26-guided-cylinder-sizing-design.md). Reuses the same ten
// existing parameters pneumatic_sizing.* already reuses; mints new IDs
// rather than reusing pneumatic_sizing.*'s own four analogous parameters
// (Decision 1: two different modules, two different catalog targets,
// this registry's own "never let a resolved value from one module look
// like a compatible link source for an unrelated one" convention). Adds
// three new unsigned lever-arm inputs (roll_offset/pitch_offset/
// yaw_offset) and one new computed output (required_moment, a Euclidean
// sum of three independently-computed moments -- a disclosed engineering
// assumption, not an SMC-documented combination method). No new
// unit-registry dimension or unit is needed (N*m/torqueDisplay already
// exist).
//

import { makeQuantity } from "../units";
import { defineParameter } from "./define";
import type { ParameterDefinition } from "./types";

/** Semantic version of the released canonical parameter registry. */
export const PARAMETER_REGISTRY_VERSION = "1.19.0";

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

// --- Ball-screw motor sizing (Unit 6.2 Stage 2) ------------------------------
// See context/modules/ball-screw-motor-sizing/stage-2-contract.md.
// `ball-screw-motor-sizing 0.1.0` is self-contained (ADR-0011 "Reuse
// policy"): it reproduces the physics already released in
// axis-load-cases, ball-screw, motion-profile, and drive-train rather than
// linking to their outputs, and calls lib/engine/mechanics (Unit 6.1)
// directly for moment of inertia and Ta = J*alpha. Its own motion inputs
// (forward_*/return_*/dwell_time) are distinct parameter IDs per phase
// slot, not an indexed family sharing one canonical ID -- the specific fix
// for motion-profile's own move_{1..5}_* port-resolution defect
// (context/progress-tracker.md "Open decisions"). Its own safety-factor
// inputs (effective_torque_safety_factor, momentary_torque_safety_factor,
// both >= 1) multiply a computed torque up to a required minimum motor
// rating -- the inverse direction from drive.rms_torque_margin/
// drive.peak_torque_margin (<= 1, an allowed fraction of a known candidate
// motor's own rated torque), because this module takes no candidate
// motor's own rated/peak torque as an input at all (stage-2-contract.md
// "Decisions" item 4).

const motorSizingBallScrew: readonly ParameterDefinition[] = [
  defineParameter({
    id: "motor_sizing.ball_screw.screw_diameter",
    displayName: "Ball-screw shaft nominal diameter",
    symbol: "D",
    definition:
      "Nominal (outer) diameter of the ball-screw shaft, used for a solid-cylinder moment-of-inertia estimate (lib/engine/mechanics' solidCylinderInertia). Distinct from screw.minor_diameter, which is the root/minor diameter the buckling and critical-speed formulas need -- a different engineering purpose.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.screw_mass",
    displayName: "Ball-screw shaft mass",
    symbol: "M_B",
    definition:
      "Mass of the ball-screw shaft, matching Oriental Motor's own worked example's directly-stated MB rather than a density-derived value (stage-1-spec.md 'Reference Examples' item 1).",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.external_force",
    displayName: "External force along the axis of travel",
    symbol: "F_A",
    definition:
      "External force along the axis of travel, beyond gravity and friction (Oriental Motor's own F_A). Zero is a structural 'no additional external force' default, the same category as screw.gear_ratio = 1 -- not a guessed physical value.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.forward_move_distance",
    displayName: "Forward move distance",
    symbol: "L_fwd",
    definition:
      "Commanded travel distance of the forward move -- the one move every 0.1.0 cycle has (stage-2-contract.md 'Decisions' item 2). On a vertical or inclined axis, 'forward' is the direction that moves away from gravity (upward); 'return' is gravity-assisted (downward) -- a structural convention stated here, not a guessed physical value, needed to resolve the sign of the gravity term in forward_load_torque/return_load_torque. Direction is immaterial on a horizontal axis.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.forward_max_velocity",
    displayName: "Forward move maximum velocity",
    symbol: "V_fwd",
    definition: "Velocity ceiling for the forward move.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.forward_max_acceleration",
    displayName: "Forward move maximum acceleration",
    symbol: "A_fwd",
    definition:
      "Symmetric acceleration/deceleration ceiling for the forward move.",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: [...accelDisplay],
    range: { min: 0, unit: "m/s^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.return_move_distance",
    displayName: "Return move distance",
    symbol: "L_ret",
    definition:
      "Commanded travel distance of an optional return move -- the gravity-assisted (downward, on a vertical/inclined axis) direction; see forward_move_distance's own definition for the direction convention. Required together with return_max_velocity and return_max_acceleration whenever any one is supplied -- a package-level input-schema rule, not a registry constraint (stage-2-contract.md 'Decisions' item 2).",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.return_max_velocity",
    displayName: "Return move maximum velocity",
    symbol: "V_ret",
    definition: "Velocity ceiling for the return move.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.return_max_acceleration",
    displayName: "Return move maximum acceleration",
    symbol: "A_ret",
    definition:
      "Symmetric acceleration/deceleration ceiling for the return move.",
    valueType: "quantity",
    canonicalUnit: "m/s^2",
    displayUnits: [...accelDisplay],
    range: { min: 0, unit: "m/s^2" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.dwell_time",
    displayName: "Dwell time",
    symbol: "t_dwell",
    definition:
      "Stationary dwell duration within one full cycle. Zero (the default) is a structural 'no dwell modeled' statement, not a guessed physical value -- the same category as screw.gear_ratio = 1.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "s") },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.motor_rotor_inertia",
    displayName: "Candidate motor rotor moment of inertia",
    symbol: "J_M",
    definition:
      "Rotor moment of inertia of the candidate servo motor, from its own catalog data -- the one engineer-typed catalog figure this module's 0.1.0 scope needs, required so the inertia-ratio check has something real to check against (stage-2-contract.md 'Decisions' item 4). Used by total_system_inertia and inertia_ratio.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.effective_torque_safety_factor",
    displayName: "Effective (RMS) torque safety factor",
    symbol: "Sf_rms",
    definition:
      "Multiplier (>= 1) applied to effective_torque to obtain required_motor_rated_torque -- the minimum continuous torque rating a candidate motor must have. Engineer-supplied, no built-in default: this is the inverse direction from drive.rms_torque_margin (<= 1, a fraction of a known motor's own rated torque), since this module takes no candidate motor's own rated torque as an input (stage-2-contract.md 'Decisions' item 4). Oriental Motor's own page 6 gives this exact Sf shape (TM = (TL+Ta)*Sf).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.momentary_torque_safety_factor",
    displayName: "Momentary (peak) torque safety factor",
    symbol: "Sf_peak",
    definition:
      "Multiplier (>= 1) applied to momentary_torque to obtain required_motor_peak_torque -- the minimum peak torque rating a candidate motor must have. Kept separate from effective_torque_safety_factor: RMS/continuous and momentary/peak are two physically distinct failure modes, and no source ties them to one shared number (the same reasoning drive-train/stage-2-contract.md 'Decisions' item 3 already gives for its own two separate margins).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same five-way sourced disagreement (2:1 to 100:1, depending on control technology, tuning method, and positioning objective) drive-train/stage-1-spec.md item 5 already documents, reused by citation here, not re-researched.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.screw_inertia",
    displayName: "Ball-screw shaft rotating inertia",
    symbol: "J_B",
    definition:
      "The ball-screw shaft's own rotating moment of inertia (solidCylinderInertia over screw_diameter and screw_mass).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.load_inertia",
    displayName: "Screw-shaft-reflected load inertia",
    symbol: "J_W",
    definition:
      "screw_inertia plus the table-and-load's own linear-motion-equivalent inertia (linearMotionInertia over total_moving_mass and the screw lead), reflected to the screw shaft -- matching Oriental Motor's own JW = M*(P/2pi)^2 + JB.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.reflected_load_inertia",
    displayName: "Motor-shaft-reflected load inertia",
    symbol: "J_L",
    definition:
      "load_inertia reflected to the motor shaft through screw.gear_ratio (JL = JW/i^2).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.total_system_inertia",
    displayName: "Total system inertia",
    symbol: "J_total",
    definition: "motor_rotor_inertia + reflected_load_inertia.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.inertia_ratio",
    displayName: "Load-to-rotor inertia ratio",
    symbol: "R_J",
    definition:
      "reflected_load_inertia / motor_rotor_inertia. Checked against inertia_ratio_maximum -- the one real catalog-free pass/fail check in 0.1.0.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.forward_load_torque",
    displayName: "Forward-direction load torque",
    symbol: "T_Lfwd",
    definition:
      "Load torque for the forward direction, per Oriental Motor's own ball-screw-drive load-torque formula.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.return_load_torque",
    displayName: "Return-direction load torque",
    symbol: "T_Lret",
    definition:
      "Load torque for the return direction -- generally different from forward_load_torque on a vertical or inclined axis, since gravity's own contribution flips sign by direction (stage-2-contract.md 'Decisions' item 3). Meaningful only when a return move is declared.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.forward_acceleration_torque",
    displayName: "Forward-direction acceleration torque",
    symbol: "T_Afwd",
    definition:
      "Acceleration/deceleration torque during the forward move's own accel/decel phases (Ta = total_system_inertia * alpha, lib/engine/mechanics' accelerationTorque).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.return_acceleration_torque",
    displayName: "Return-direction acceleration torque",
    symbol: "T_Aret",
    definition:
      "Acceleration/deceleration torque during the return move's own accel/decel phases. Meaningful only when a return move is declared.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.momentary_torque",
    displayName: "Maximum momentary torque",
    symbol: "T_1",
    definition:
      "Highest single-phase torque across every phase in the full cycle (T1 = Ta + TL, taken at whichever phase governs).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.effective_torque",
    displayName: "Effective (RMS) torque",
    symbol: "T_rms",
    definition:
      "RMS torque over the full cycle, Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)) over every real phase in the cycle -- a genuine multi-phase computation, not drive-train@0.1.0's own closed-form approximation from a single scalar rms_acceleration (stage-1-spec.md item 5, the structural fix ADR-0011 exists to make).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "rms" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.operating_speed",
    displayName: "Motor-shaft operating speed",
    symbol: "N_op",
    definition:
      "Peak motor-shaft rotational speed across the forward and return moves.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.required_motor_rated_torque",
    displayName: "Required motor rated (continuous) torque",
    symbol: "T_Mreq",
    definition:
      "effective_torque * effective_torque_safety_factor -- the minimum continuous torque rating a candidate motor must have.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.required_motor_peak_torque",
    displayName: "Required motor peak (maximum momentary) torque",
    symbol: "T_Mmaxreq",
    definition:
      "momentary_torque * momentary_torque_safety_factor -- the minimum peak torque rating a candidate motor must have.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.ball_screw.required_power",
    displayName: "Required motor power",
    symbol: "P_req",
    definition:
      "rotationalPower(required_motor_rated_torque, operating_speed) -- lib/engine/units' already-released P = T*omega. The required-power figure ADR-0011 'Output scope' names alongside torque/speed/inertia.",
    valueType: "quantity",
    canonicalUnit: "W",
    displayUnits: ["W", "kW", "hp"],
    range: { min: 0, unit: "W" },
    qualifiers: { bound: "required" },
  }),
];

// --- Direct-drive conveyor motor sizing (Unit 6.3 Stage 2) ------------------
// See context/modules/direct-drive-conveyor-motor-sizing/stage-2-contract.md.
// A second, independent Motor Sizing Tool family module (ADR-0011),
// self-contained the same way motor_sizing.ball_screw.* is: reuses only
// motion.axis.gravity directly and calls lib/engine/mechanics (Unit 6.1)
// for linearMotionInertia/accelerationTorque. Its own belt_friction_
// coefficient is a deliberately new parameter, not a reuse of motion.axis.
// friction_coefficient -- a different physical interface (belt-to-load
// friction, typically ~0.3) with a different typical value from a
// linear-guide's own sliding friction (~0.05). Scoped to a single
// acceleration event (0 to target_belt_speed), not a full accelerate/run/
// decelerate cycle or an RMS torque check -- no source found for this
// mechanism computes or needs either (stage-2-contract.md "Decisions" item
// 3), a narrower scope than motor_sizing.ball_screw.* by design. Has no
// gear-ratio parameter at all, not one defaulted to 1: 0.1.0's own purpose
// is specifically the direct-drive (no gearbox) case (stage-2-contract.md
// "Decisions" item 5).

const motorSizingDirectDriveConveyor: readonly ParameterDefinition[] = [
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.drive_roller_diameter",
    displayName: "Drive roller diameter",
    symbol: "D1",
    definition: "Diameter of the motor-driven roller.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.drive_roller_mass",
    displayName: "Drive roller mass",
    symbol: "M1",
    definition: "Mass of the drive roller.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.idler_roller_diameter",
    displayName: "Idler roller diameter",
    symbol: "D2",
    definition:
      "Diameter of the non-driven (idler) roller. May differ from drive_roller_diameter -- Omron's own general inertia formula reflects the idler by (D1/D2)^2 (stage-1-spec.md 'Candidate Methods' item 1).",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.idler_roller_mass",
    displayName: "Idler roller mass",
    symbol: "M2",
    definition: "Mass of the idler roller.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.belt_mass",
    displayName: "Belt mass",
    symbol: "M4",
    definition:
      "Mass of the conveyor belt itself -- Omron's own distinct belt-mass inertia term, not folded into carried_load_mass (stage-1-spec.md 'Candidate Methods' item 1).",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.carried_load_mass",
    displayName: "Carried load mass",
    symbol: "M3",
    definition: "Mass of the object(s) riding the belt.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.belt_friction_coefficient",
    displayName: "Belt/load friction coefficient",
    symbol: "mu",
    definition:
      "Coefficient of friction between the belt and the carried load. Deliberately not a reuse of motion.axis.friction_coefficient (a different physical interface with a materially different typical value -- stage-2-contract.md 'Decisions' item 2). No upper cap: unlike a lubricated linear-guide interface, a belt/load material pair can genuinely exceed a coefficient of 1.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.mechanical_efficiency",
    displayName: "Belt/roller mechanical efficiency",
    symbol: "eta",
    definition:
      "Mechanical efficiency of the belt/roller drive, used by the load-torque formula (both reference examples use 0.9 -- stage-1-spec.md 'Reference Examples').",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.target_belt_speed",
    displayName: "Target belt speed",
    symbol: "V_belt",
    definition: "Commanded steady-state belt speed.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.acceleration_time",
    displayName: "Acceleration time",
    symbol: "t_A",
    definition:
      "Ramp time from standstill to target_belt_speed -- the single event this module's own torque checks are governed by (stage-2-contract.md 'Decisions' item 3; no source found for this mechanism computes a deceleration-phase or RMS torque).",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.motor_rotor_inertia",
    displayName: "Candidate motor rotor moment of inertia",
    symbol: "J_M",
    definition:
      "Rotor moment of inertia of the candidate motor, from its own catalog data -- the one engineer-typed catalog figure this module's 0.1.0 scope needs, required so the inertia-ratio check has something real to check against (the same role motor_sizing.ball_screw.motor_rotor_inertia already plays).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.required_torque_safety_factor",
    displayName: "Required torque safety factor",
    symbol: "Sf",
    definition:
      "Multiplier (>= 1) applied to momentary_torque to obtain required_torque. A single combined factor, not two separate margins: this module computes no RMS torque distinct from its own momentary torque (stage-2-contract.md 'Decisions' item 4), unlike motor_sizing.ball_screw.*. Engineer-supplied, no built-in default; both fully-verified reference examples use Sf = 2.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent motor_sizing.ball_screw.inertia_ratio_maximum already established, reused by citation, not re-researched.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.reflected_load_inertia",
    displayName: "Reflected load inertia",
    symbol: "J_L",
    definition:
      "Total inertia of the idler roller (reflected by (drive_roller_diameter/idler_roller_diameter)^2), the belt, and the carried load, all already on the drive-roller/motor shaft in 0.1.0's own direct-drive scope. Excludes the drive roller's own inertia, which total_system_inertia adds directly (stage-2-contract.md 'Method Sources' -- a naming-consistency split from Omron's own single combined JW, not a physics difference).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.total_system_inertia",
    displayName: "Total system inertia",
    symbol: "J_total",
    definition:
      "motor_rotor_inertia + drive_roller_inertia (internal) + reflected_load_inertia.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.inertia_ratio",
    displayName: "Load-to-rotor inertia ratio",
    symbol: "R_J",
    definition:
      "reflected_load_inertia / motor_rotor_inertia. Checked against inertia_ratio_maximum -- the one real catalog-free pass/fail check in 0.1.0.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.load_torque",
    displayName: "Load torque",
    symbol: "T_L",
    definition:
      "Steady-state friction-driven load torque: T_L = mu*(belt_mass+carried_load_mass)*gravity*drive_roller_diameter / (2*mechanical_efficiency).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.acceleration_torque",
    displayName: "Acceleration torque",
    symbol: "T_A",
    definition:
      "Torque to accelerate total_system_inertia over acceleration_time up to target_belt_speed (Ta = J_total*alpha, lib/engine/mechanics' accelerationTorque). Always positive in 0.1.0's own accelerate-only scope (stage-2-contract.md 'Decisions' item 3).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.momentary_torque",
    displayName: "Maximum momentary torque",
    symbol: "T1",
    definition:
      "acceleration_torque + load_torque -- the governing peak/starting torque, matching both reference examples' own combined breakaway/acceleration check.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.required_torque",
    displayName: "Required motor torque",
    symbol: "T_req",
    definition:
      "momentary_torque * required_torque_safety_factor -- the minimum torque rating a candidate motor must have. Reported as an output value, not checked pass/fail against anything in 0.1.0 (ADR-0011's own 'required specs only' scope).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.operating_speed",
    displayName: "Motor-shaft operating speed",
    symbol: "N_op",
    definition:
      "Motor/drive-roller shaft rotational speed at target_belt_speed (omega = target_belt_speed / (drive_roller_diameter/2)).",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
  }),
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.required_power",
    displayName: "Required motor power",
    symbol: "P_req",
    definition:
      "rotationalPower(required_torque, operating_speed) -- lib/engine/units' already-released P = T*omega. The required-power figure ADR-0011 'Output scope' names alongside torque/speed/inertia.",
    valueType: "quantity",
    canonicalUnit: "W",
    displayUnits: ["W", "kW", "hp"],
    range: { min: 0, unit: "W" },
    qualifiers: { bound: "required" },
  }),
];

// --- Rack-and-pinion motor sizing (Unit 6.4 Stage 2) ------------------------
// See context/modules/rack-pinion-motor-sizing/stage-2-contract.md. The
// third Motor Sizing Tool family module (ADR-0011), architecturally closer
// to motor_sizing.ball_screw.* than to motor_sizing.direct_drive_conveyor.*
// -- a rack-and-pinion axis is the same "one rigid carriage on a guide"
// mechanism class as a ball screw, not the conveyor's "loose load on a
// moving surface" class (stage-1-spec.md "Relationship to Existing and
// Planned Modules"). Reuses motion.axis.orientation/incline_angle/gravity/
// friction_coefficient/total_moving_mass directly -- the identical physical
// interface and formula shape motor_sizing.ball_screw.* already reuses
// (Oriental Motor's own general_catalog_motor_fan_sizing page F-3 prints
// the ball-screw and rack-and-pinion force formulas identically:
// F = FA + m*(sin(alpha)+mu*cos(alpha))). New gear_ratio/mechanical_
// efficiency/external_force parameters are minted rather than reusing
// screw.gear_ratio/screw.mechanical_efficiency/motor_sizing.ball_screw.
// external_force -- same quantity kind, different meaning-scoped namespace
// (code-standards.md "Canonical Parameters"). Scoped to a single
// accelerate-to-speed event, not a full accelerate/run/decelerate cycle or
// an RMS torque check -- no source found for this mechanism computes or
// needs either (stage-1-spec.md "Purpose"), the same finding
// motor_sizing.direct_drive_conveyor.* already established, independently
// confirmed here for a different mechanism.

const motorSizingRackPinion: readonly ParameterDefinition[] = [
  defineParameter({
    id: "motor_sizing.rack_pinion.pinion_pitch_diameter",
    displayName: "Pinion pitch diameter",
    symbol: "D",
    definition:
      "Pitch diameter of the drive pinion, used for both the load-torque conversion and the pinion's own moment of inertia (lib/engine/mechanics' solidCylinderInertia).",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.pinion_mass",
    displayName: "Pinion mass",
    symbol: "M_pinion",
    definition: "Mass of the drive pinion.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.gear_ratio",
    displayName: "Rack-and-pinion drive gear ratio",
    symbol: "i",
    definition:
      "Gear ratio between the pinion and its driving motor shaft. 1 for a direct-connected pinion with no gearbox in between (the default -- a structural statement about the drive path, not a guessed physical value, the same convention screw.gear_ratio already establishes). Not a reuse of screw.gear_ratio -- that ID's own meaning is scoped to ball/lead-screw mechanisms (stage-1-spec.md 'Existing Parameter Review').",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(1, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.mechanical_efficiency",
    displayName: "Rack-and-pinion mechanical efficiency",
    symbol: "eta",
    definition:
      "Mechanical efficiency of the rack-and-pinion gear mesh, used by the load-torque formula (Oriental Motor's own T_L = F*D/(2*eta*i)). Not a reuse of screw.mechanical_efficiency -- a gear mesh is a different physical interface from a ball-nut/screw, with no established shared typical-value precedent (stage-1-spec.md 'Existing Parameter Review').",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.external_force",
    displayName: "External force along the axis of travel",
    symbol: "F_A",
    definition:
      "External force along the axis of travel, beyond gravity and friction (Oriental Motor's own F_A). Zero is a structural 'no additional external force' default, the same category as gear_ratio = 1 -- not a guessed physical value. Not a reuse of motor_sizing.ball_screw.external_force (stage-1-spec.md 'Existing Parameter Review').",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.target_velocity",
    displayName: "Target carriage velocity",
    symbol: "V",
    definition:
      "Commanded steady-state carriage velocity along the axis of travel.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.acceleration_time",
    displayName: "Acceleration time",
    symbol: "t_A",
    definition:
      "Ramp time from standstill to target_velocity -- the single event this module's own torque checks are governed by (stage-1-spec.md 'Purpose'; no source found for this mechanism computes a return-move, dwell, or RMS-cycle torque).",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.motor_rotor_inertia",
    displayName: "Candidate motor rotor moment of inertia",
    symbol: "J_M",
    definition:
      "Rotor moment of inertia of the candidate motor, from its own catalog data -- the one engineer-typed catalog figure this module's 0.1.0 scope needs, required so the inertia-ratio check has something real to check against (the same role every other motor_sizing.*.motor_rotor_inertia already plays).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.required_torque_safety_factor",
    displayName: "Required torque safety factor",
    symbol: "Sf",
    definition:
      "Multiplier (>= 1) applied to momentary_torque to obtain required_torque. A single combined factor, not two separate margins: this module computes no RMS torque distinct from its own momentary torque (stage-1-spec.md 'Purpose'), unlike motor_sizing.ball_screw.*. Engineer-supplied, no built-in default.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent every other motor_sizing.*.inertia_ratio_maximum already established, reused by citation, not re-researched.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.pinion_inertia",
    displayName: "Pinion rotating inertia",
    symbol: "J_pinion",
    definition:
      "The drive pinion's own moment of inertia: J_pinion = (1/8)*M_pinion*D^2 (lib/engine/mechanics' solidCylinderInertia).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.load_inertia",
    displayName: "Load inertia (pinion + carriage)",
    symbol: "J_W",
    definition:
      "pinion_inertia plus the carriage's own linear-motion-equivalent inertia at the pinion shaft (lib/engine/mechanics' linearMotionInertia, travel per pinion revolution = pi*D) -- mirrors motor_sizing.ball_screw.load_inertia's own combined (screw + carried mass) composition.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.reflected_load_inertia",
    displayName: "Reflected load inertia",
    symbol: "J_L",
    definition: "load_inertia / gear_ratio^2.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.total_system_inertia",
    displayName: "Total system inertia",
    symbol: "J_total",
    definition: "motor_rotor_inertia + reflected_load_inertia.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.inertia_ratio",
    displayName: "Load-to-rotor inertia ratio",
    symbol: "R_J",
    definition:
      "reflected_load_inertia / motor_rotor_inertia. Checked against inertia_ratio_maximum -- the one real catalog-free pass/fail check in 0.1.0.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.load_torque",
    displayName: "Load torque",
    symbol: "T_L",
    definition:
      "T_L = F*D/(2*eta*i), F = F_A + total_moving_mass*gravity*(sin(incline_angle)+friction_coefficient*cos(incline_angle)) -- Oriental Motor's own rack-and-pinion load-torque formula, identical in shape to the ball-screw formula on the same source page (stage-1-spec.md 'Candidate Methods' item 1).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.acceleration_torque",
    displayName: "Acceleration torque",
    symbol: "T_A",
    definition:
      "Torque to accelerate total_system_inertia over acceleration_time up to the motor-shaft-equivalent of target_velocity (Ta = J_total*alpha, lib/engine/mechanics' accelerationTorque). Always positive in 0.1.0's own accelerate-only scope.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.momentary_torque",
    displayName: "Maximum momentary torque",
    symbol: "T1",
    definition:
      "acceleration_torque + load_torque -- the governing peak/starting torque, matching Andantex's own and Atlanta's own combined tangential-force check (stage-1-spec.md 'Candidate Methods' items 3-4), converted to torque via the pinion pitch radius.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.required_torque",
    displayName: "Required motor torque",
    symbol: "T_req",
    definition:
      "momentary_torque * required_torque_safety_factor -- the minimum torque rating a candidate motor must have. Reported as an output value, not checked pass/fail against anything in 0.1.0 (ADR-0011's own 'required specs only' scope).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.operating_speed",
    displayName: "Motor-shaft operating speed",
    symbol: "N_op",
    definition:
      "Motor shaft rotational speed at target_velocity: omega_pinion = target_velocity/(pinion_pitch_diameter/2); omega_motor = omega_pinion*gear_ratio.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
  }),
  defineParameter({
    id: "motor_sizing.rack_pinion.required_power",
    displayName: "Required motor power",
    symbol: "P_req",
    definition:
      "rotationalPower(required_torque, operating_speed) -- lib/engine/units' already-released P = T*omega.",
    valueType: "quantity",
    canonicalUnit: "W",
    displayUnits: ["W", "kW", "hp"],
    range: { min: 0, unit: "W" },
    qualifiers: { bound: "required" },
  }),
];

// --- Belt-pulley drive motor sizing (Unit 6.5 Stage 2) ---------------------
// See context/modules/belt-pulley-drive-motor-sizing/stage-1-spec.md. The
// fourth Motor Sizing Tool family module (ADR-0011). Shares one
// load-torque/force formula set with motor_sizing.rack_pinion.* -- three
// independent sources state the belt-drive and rack-and-pinion equations
// as one combined set (Oriental Motor's own "Wire Belt Mechanism, Rack and
// Pinion Mechanism" page F-3; AutomationDirect's own "Belt Drive (or Rack
// & Pinion) Equations" Table 1; Andantex corroborating the same shape) --
// so this group reuses motion.axis.* for orientation/incline/gravity/
// friction/mass exactly as motor_sizing.rack_pinion.* does. What genuinely
// differs and justifies a separate group: two pulleys rather than one
// pinion, and a belt that carries its own translating mass (a fixed rack
// carries none). Efficiency is applied to LOAD TORQUE, following Oriental
// Motor and every already-released sibling module -- AutomationDirect's own
// source instead divides the INERTIA by efficiency, a real, disclosed
// modeling disagreement (stage-1-spec.md "A real disagreement between
// sources"), not silently reconciled.

const motorSizingBeltPulley: readonly ParameterDefinition[] = [
  defineParameter({
    id: "motor_sizing.belt_pulley.pulley_pitch_diameter",
    displayName: "Pulley pitch diameter",
    symbol: "D",
    definition:
      "Pitch diameter of the drive pulley, used for the load-torque conversion, the pulley moment of inertia, and the belt/carriage linear-motion-equivalent inertia. Both pulleys are assumed equal in diameter (every source's own worked example assumes this -- stage-1-spec.md 'Validity Envelope').",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.pulley_mass",
    displayName: "Drive pulley mass",
    symbol: "M_drive",
    definition: "Mass of the motor-driven pulley.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.idler_pulley_mass",
    displayName: "Idler pulley mass",
    symbol: "M_idler",
    definition:
      "Mass of the non-driven (idler) pulley. A distinct input rather than a doubling of pulley_mass: AutomationDirect's own worked example multiplies one pulley's inertia by 2 ('remember, there are two pulleys') only because both pulleys are identical in that example, which is not required in general.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.belt_mass",
    displayName: "Belt mass",
    symbol: "M_belt",
    definition:
      "Mass of the drive belt itself, which translates with the carriage and contributes its own linear-motion-equivalent inertia. The term a rack-and-pinion drive does not have at all (a fixed rack contributes no inertia) -- one of the two real differences justifying a separate module from motor_sizing.rack_pinion.* (stage-1-spec.md).",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "kg") },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.gear_ratio",
    displayName: "Belt-pulley drive gear ratio",
    symbol: "i",
    definition:
      "Gear ratio between the drive pulley and its driving motor shaft. 1 for a direct-connected pulley with no gearbox in between (the default -- a structural statement about the drive path, not a guessed physical value).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(1, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.mechanical_efficiency",
    displayName: "Belt/pulley mechanical efficiency",
    symbol: "eta",
    definition:
      "Mechanical efficiency of the belt-and-pulley drive, applied to the load-torque formula (T_L = F*D/(2*eta*i)), following Oriental Motor's own convention and every already-released Motor Sizing Tool sibling. AutomationDirect's own source instead divides the inertia by efficiency -- a real, disclosed modeling disagreement between the two primary sources (stage-1-spec.md).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio", "percent"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.external_force",
    displayName: "External force along the axis of travel",
    symbol: "F_A",
    definition:
      "External force along the axis of travel, beyond gravity and friction. Zero is a structural 'no additional external force' default, not a guessed physical value.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.target_velocity",
    displayName: "Target carriage velocity",
    symbol: "V",
    definition:
      "Commanded steady-state carriage velocity along the axis of travel.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: [...speedDisplay],
    range: { min: 0, unit: "m/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.acceleration_time",
    displayName: "Acceleration time",
    symbol: "t_A",
    definition:
      "Ramp time from standstill to target_velocity -- the single event this module's own torque checks are governed by; no source found for this mechanism computes a return-move, dwell, or RMS-cycle torque.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.motor_rotor_inertia",
    displayName: "Candidate motor rotor moment of inertia",
    symbol: "J_M",
    definition:
      "Rotor moment of inertia of the candidate motor, from its own catalog data -- required so the inertia-ratio check has something real to check against (the same role every other motor_sizing.*.motor_rotor_inertia already plays).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.required_torque_safety_factor",
    displayName: "Required torque safety factor",
    symbol: "Sf",
    definition:
      "Multiplier (>= 1) applied to momentary_torque to obtain required_torque. A single combined factor: this module computes no RMS torque distinct from its own momentary torque. Engineer-supplied, no built-in default.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent every other motor_sizing.*.inertia_ratio_maximum already established. AutomationDirect's own belt-drive example uses 10 ('It is best to keep the load to motor inertia ratio at or below 10'), one datapoint among the wide sourced disagreement drive-train/stage-1-spec.md already records.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Default of 10:1 -- founder-directed, and also the one value AutomationDirect's own belt-drive worked example uses ('It is best to keep the load to motor inertia ratio at or below 10', already cited by motor_sizing.belt_pulley.inertia_ratio_maximum's own definition) -- one corroborating datapoint, not a full sourced justification for every application. Use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.pulley_inertia",
    displayName: "Combined pulley rotating inertia",
    symbol: "J_pulleys",
    definition:
      "Drive plus idler pulley moment of inertia about the drive shaft: (1/8)*(M_drive+M_idler)*D^2, both pulleys sharing one diameter (lib/engine/mechanics' solidCylinderInertia).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.belt_inertia",
    displayName: "Belt linear-motion-equivalent inertia",
    symbol: "J_belt",
    definition:
      "The belt's own translating mass expressed as inertia at the drive-pulley shaft: M_belt*(D/2)^2 (lib/engine/mechanics' linearMotionInertia, travel per revolution = pi*D).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.load_inertia",
    displayName: "Load inertia (pulleys + belt + carriage)",
    symbol: "J_W",
    definition:
      "pulley_inertia + belt_inertia + the carriage's own linear-motion-equivalent inertia at the drive-pulley shaft.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.reflected_load_inertia",
    displayName: "Reflected load inertia",
    symbol: "J_L",
    definition: "load_inertia / gear_ratio^2.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.total_system_inertia",
    displayName: "Total system inertia",
    symbol: "J_total",
    definition: "motor_rotor_inertia + reflected_load_inertia.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.inertia_ratio",
    displayName: "Load-to-rotor inertia ratio",
    symbol: "R_J",
    definition:
      "reflected_load_inertia / motor_rotor_inertia. Checked against inertia_ratio_maximum -- the one real catalog-free pass/fail check in 0.1.0.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.load_torque",
    displayName: "Load torque",
    symbol: "T_L",
    definition:
      "T_L = F*D/(2*eta*i), F = F_A + total_moving_mass*gravity*(sin(incline_angle)+friction_coefficient*cos(incline_angle)) -- Oriental Motor's own combined wire-belt/rack-and-pinion load-torque formula (p. F-3).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.acceleration_torque",
    displayName: "Acceleration torque",
    symbol: "T_A",
    definition:
      "Torque to accelerate total_system_inertia over acceleration_time up to the motor-shaft-equivalent of target_velocity (Ta = J_total*alpha).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.momentary_torque",
    displayName: "Maximum momentary torque",
    symbol: "T1",
    definition:
      "acceleration_torque + load_torque -- the governing peak/starting torque, matching AutomationDirect's own T_motor = T_accel + T_run shape.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.required_torque",
    displayName: "Required motor torque",
    symbol: "T_req",
    definition:
      "momentary_torque * required_torque_safety_factor -- the minimum torque rating a candidate motor must have. Reported as an output value, not checked pass/fail against anything in 0.1.0.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.operating_speed",
    displayName: "Motor-shaft operating speed",
    symbol: "N_op",
    definition:
      "Motor shaft rotational speed at target_velocity: omega_pulley = target_velocity/(pulley_pitch_diameter/2); omega_motor = omega_pulley*gear_ratio.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.required_power",
    displayName: "Required motor power",
    symbol: "P_req",
    definition:
      "rotationalPower(required_torque, operating_speed) -- lib/engine/units' already-released P = T*omega.",
    valueType: "quantity",
    canonicalUnit: "W",
    displayUnits: ["W", "kW", "hp"],
    range: { min: 0, unit: "W" },
    qualifiers: { bound: "required" },
  }),

  // 0.2.0 additions (registry 1.14.0, stage-2-contract.md "0.2.0
  // Addendum"): a native repeating trapezoidal motion cycle (accelerate/
  // run/decelerate/dwell), velocity-first or distance-first input, and
  // deceleration/effective (RMS) torque outputs -- the follow-on work
  // ADR-0011 itself named (embed motion-profile math natively inside each
  // mechanism module, not cross-module-linked). Source: jp.oriental_motor.
  // motor_sizing_calculations@web-2026-08-08, pp. 5-6, both generic "for
  // all motors" formulas.
  defineParameter({
    id: "motor_sizing.belt_pulley.motion_mode",
    displayName: "Motion input mode",
    symbol: "mode",
    definition:
      "Which two of {target_velocity, travel_distance, constant_velocity_time, cycle_time} the engineer supplies directly, and which two the kernel derives. 'velocity': supply target_velocity and constant_velocity_time, derive travel_distance and cycle_time. 'distance': supply travel_distance and cycle_time, derive target_velocity and constant_velocity_time. Regardless of mode, all four are always reported (belt-pulley-drive-motor-sizing-0.2.0-design.md 'Input Mode').",
    valueType: "enum",
    enumId: "belt_pulley_motion_mode",
    enumOptions: ["velocity", "distance"],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.deceleration_time",
    displayName: "Deceleration time",
    symbol: "t_D",
    definition:
      "Ramp time from target_velocity back to standstill -- symmetric to acceleration_time, required in both motion modes.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.dwell_time",
    displayName: "Dwell time",
    symbol: "t_dwell",
    definition:
      "Idle time between the end of deceleration and the next cycle's own acceleration phase. Contributes zero torque but counts toward cycle_time, matching how a servo's own thermal/RMS rating averages over idle time. Zero is a structural 'no dwell modeled' default, not a guessed physical value.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "s") },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.constant_velocity_time",
    displayName: "Constant-velocity (run) time",
    symbol: "t2",
    definition:
      "Duration of the constant-velocity phase between acceleration and deceleration. A required input in motion_mode='velocity'; a derived, always-reported output otherwise (cycle_time - acceleration_time - deceleration_time - dwell_time). Zero is a valid boundary case (a triangular move, no constant-speed phase), not an error.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.cycle_time",
    displayName: "Total cycle time",
    symbol: "tf",
    definition:
      "Total repeating-cycle duration (acceleration_time + constant_velocity_time + deceleration_time + dwell_time). A required input in motion_mode='distance'; a derived, always-reported output otherwise.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.travel_distance",
    displayName: "Travel distance",
    symbol: "S",
    definition:
      "Carriage travel distance over one accelerate/run/decelerate move (S = target_velocity*(acceleration_time+deceleration_time)/2 + target_velocity*constant_velocity_time). A required input in motion_mode='distance'; a derived, always-reported output otherwise.",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.deceleration_torque",
    displayName: "Deceleration torque",
    symbol: "T_D",
    definition:
      "Torque to decelerate total_system_inertia over deceleration_time from the motor-shaft-equivalent of target_velocity to standstill (Td = J_total*alpha_decel, magnitude) -- symmetric to acceleration_torque.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.belt_pulley.effective_torque",
    displayName: "Effective (RMS) torque",
    symbol: "T_rms",
    definition:
      "Trms = sqrt(((acceleration_torque+load_torque)^2*acceleration_time + load_torque^2*constant_velocity_time + (deceleration_torque-load_torque)^2*deceleration_time) / cycle_time) -- Oriental Motor's own generic per-phase effective-load-torque formula for continuous/thermal motor rating (jp.oriental_motor.motor_sizing_calculations, p. 6), additive to momentary_torque, not a replacement for it.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "rms" },
  }),
];

// motor_sizing.index_table.* -- Unit 6.6, the fifth Motor Sizing Tool
// module (ADR-0011). Genuinely different in kind from every sibling: an
// index table's own motion is rotary (index_angle over index_time,
// commanded directly in angular terms), not a carriage translating along a
// linear axis, so this is the first Motor Sizing Tool group with NO
// motion.axis.* reuse at all (stage-1-spec.md "Genuinely different in
// kind"). load_torque is a required INPUT with a 0 N*m structural default,
// not a computed output -- both primary sources (Oriental Motor,
// AutomationDirect) independently omit a load-torque formula for this
// mechanism entirely, stating bearing/support friction is negligible
// (stage-1-spec.md "The central finding").

const motorSizingIndexTable: readonly ParameterDefinition[] = [
  defineParameter({
    id: "motor_sizing.index_table.table_mass",
    displayName: "Index table mass",
    symbol: "M_table",
    definition:
      "Mass of the rotating table/dial itself, treated as a solid cylinder about its own rotation axis.",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.table_diameter",
    displayName: "Index table diameter",
    symbol: "D",
    definition:
      "Outer diameter of the index table, used for the table's own moment of inertia. Not used for any speed conversion -- this mechanism's own motion is commanded directly in angular terms (stage-1-spec.md 'Genuinely different in kind').",
    valueType: "quantity",
    canonicalUnit: "m",
    displayUnits: [...lengthDisplay],
    range: { min: 0, unit: "m" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.attached_load_inertia",
    displayName: "Attached mounted-load inertia",
    symbol: "J_load",
    definition:
      "Combined moment of inertia of any workpieces or fixtures mounted on the table, about the table's own rotation axis -- engineer-resolved (e.g. via the parallel-axis theorem for point loads at a radius) and supplied as one figure, the same 'engineer supplies the resolved figure' treatment motor_sizing.belt_pulley.belt_mass already established. Zero is a structural 'no mounted load modeled' default, not a guessed physical value.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "kg*m^2") },
  }),
  defineParameter({
    id: "motor_sizing.index_table.gear_ratio",
    displayName: "Index-table drive gear ratio",
    symbol: "i",
    definition:
      "Gear ratio between the table shaft and its driving motor shaft. 1 for a direct-connected table with no gearbox in between (the default -- a structural statement about the drive path, not a guessed physical value, the same convention every sibling motor_sizing.*.gear_ratio already establishes).",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(1, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.index_table.index_angle",
    displayName: "Index angle",
    symbol: "theta_index",
    definition:
      "Angle rotated per index move, at the table shaft. Commanded directly in angular terms -- no linear-to-rotary radius conversion, unlike every sibling module's own target_velocity (stage-1-spec.md 'Genuinely different in kind').",
    valueType: "quantity",
    canonicalUnit: "rad",
    displayUnits: ["deg", "rad"],
    range: { min: 0, unit: "rad" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.index_time",
    displayName: "Index time",
    symbol: "t_index",
    definition:
      "Total move time for one index, at the table shaft: standstill to standstill, covering index_angle.",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.acceleration_time",
    displayName: "Acceleration time",
    symbol: "t_A",
    definition:
      "Ramp time within index_time, assumed symmetric between acceleration and deceleration -- the same role and required-input treatment every sibling motor_sizing.*.acceleration_time already plays, reused by name and role rather than by parameter ID (no sibling shares this module's own angular motion port shape).",
    valueType: "quantity",
    canonicalUnit: "s",
    displayUnits: ["s", "min"],
    range: { min: 0, unit: "s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.load_torque",
    displayName: "Load torque",
    symbol: "T_L",
    definition:
      "Motor-shaft-referred running torque due to friction or external resistance -- engineer-supplied, not computed by this module. Both primary sources (Oriental Motor, AutomationDirect) independently omit a load-torque formula for this mechanism entirely, stating that bearing/support friction is negligible (stage-1-spec.md 'The central finding'); zero is a structural default reflecting that finding, not a guessed physical value.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N*m") },
  }),
  defineParameter({
    id: "motor_sizing.index_table.motor_rotor_inertia",
    displayName: "Candidate motor rotor moment of inertia",
    symbol: "J_M",
    definition:
      "Rotor moment of inertia of the candidate motor, from its own catalog data -- required so the inertia-ratio check has something real to check against (the same role every other motor_sizing.*.motor_rotor_inertia already plays).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.required_torque_safety_factor",
    displayName: "Required torque safety factor",
    symbol: "Sf",
    definition:
      "Multiplier (>= 1) applied to momentary_torque to obtain required_torque. A single combined factor: this module computes no RMS torque distinct from its own momentary torque. Engineer-supplied, no built-in default.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent every other motor_sizing.*.inertia_ratio_maximum already established.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. This mechanism is rotary, not linear, but the same inertia-ratio concept and numeric guidance applies unchanged. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
  defineParameter({
    id: "motor_sizing.index_table.table_inertia",
    displayName: "Table moment of inertia",
    symbol: "J_T",
    definition:
      "The table's own rotating inertia about its own axis: (1/8)*table_mass*table_diameter^2 (lib/engine/mechanics' solidCylinderInertia).",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.load_inertia",
    displayName: "Load inertia (table + mounted load)",
    symbol: "J_W",
    definition: "table_inertia + attached_load_inertia.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.reflected_load_inertia",
    displayName: "Reflected load inertia",
    symbol: "J_L",
    definition: "load_inertia / gear_ratio^2.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.total_system_inertia",
    displayName: "Total system inertia",
    symbol: "J_total",
    definition: "motor_rotor_inertia + reflected_load_inertia.",
    valueType: "quantity",
    canonicalUnit: "kg*m^2",
    displayUnits: [...inertiaDisplay],
    range: { min: 0, unit: "kg*m^2" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.inertia_ratio",
    displayName: "Load-to-rotor inertia ratio",
    symbol: "R_J",
    definition:
      "reflected_load_inertia / motor_rotor_inertia. Checked against inertia_ratio_maximum -- the one real catalog-free pass/fail check in 0.1.0.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.acceleration_torque",
    displayName: "Acceleration torque",
    symbol: "T_A",
    definition:
      "Torque to accelerate total_system_inertia over acceleration_time up to the motor-shaft-equivalent indexing speed (Ta = J_total*alpha).",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.momentary_torque",
    displayName: "Maximum momentary torque",
    symbol: "T1",
    definition:
      "acceleration_torque + load_torque -- the governing peak/starting torque, matching AutomationDirect's own T_motor = T_accel + T_run shape.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required", aggregation: "peak" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.required_torque",
    displayName: "Required motor torque",
    symbol: "T_req",
    definition:
      "momentary_torque * required_torque_safety_factor -- the minimum torque rating a candidate motor must have. Reported as an output value, not checked pass/fail against anything in 0.1.0.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.operating_speed",
    displayName: "Motor-shaft operating speed",
    symbol: "N_op",
    definition:
      "Motor shaft rotational speed at the commanded indexing rate: omega_table = index_angle/(index_time-acceleration_time); omega_motor = omega_table*gear_ratio.",
    valueType: "quantity",
    canonicalUnit: "rad/s",
    displayUnits: [...angularVelocityDisplay],
    range: { min: 0, unit: "rad/s" },
  }),
  defineParameter({
    id: "motor_sizing.index_table.required_power",
    displayName: "Required motor power",
    symbol: "P_req",
    definition:
      "rotationalPower(required_torque, operating_speed) -- lib/engine/units' already-released P = T*omega.",
    valueType: "quantity",
    canonicalUnit: "W",
    displayUnits: ["W", "kW", "hp"],
    range: { min: 0, unit: "W" },
    qualifiers: { bound: "required" },
  }),
];

// --- Pneumatic cylinder (Unit 7.1 Stage 2) ----------------------------------
// See context/modules/pneumatic-cylinder/stage-2-contract.md. The first
// Milestone 7 (Phase 2) module -- a new, standalone family with no
// linear-axis@1 role and no Motor Sizing Tool family relationship. `grep`
// confirmed zero pre-existing "pneumatic.*"/"load.*"/"force.*"/"mass.*"
// entries before this release (stage-1-spec.md "Existing Parameter
// Review") -- nothing here is a reuse. mounting_style deliberately does not
// reuse screw.end_support_arrangement even though both express the same
// Euler end-fixity physics: this registry's own precedent
// (motor_sizing.rack_pinion.gear_ratio choosing not to reuse screw.gear_ratio,
// "different physical interface... no established shared typical-value
// precedent") treats a shared value *shape* on a different component
// instance as a new parameter, not a cross-domain reuse -- and this
// registry's own namespacing exists precisely so a resolved
// screw.end_support_arrangement can never be mistaken for a compatible
// upstream source for a pneumatic.mounting_style input.
// buckling_safety_factor is required with no built-in default: unlike
// ball-screw's own screw.buckling_safety_margin (a real 0.5-vs-0.8
// disagreement between two named manufacturer sources), no source read for
// this module gives a pneumatic-manufacturer-sourced value at all -- only
// Hänchen's generic, non-pneumatic "S = 3...5" range (stage-1-spec.md item
// 4) -- so the case for "required, no default" is even clearer here.
// air_consumption_per_cycle and required_air_volume are reported outputs,
// not evaluated checks (stage-1-spec.md "Validity Envelope") -- added for
// this module's own scope, the same "informational, for equipment sizing
// outside this module" treatment linear-guide gives its own preload grade.

const pneumaticCylinder: readonly ParameterDefinition[] = [
  defineParameter({
    id: "pneumatic.bore_diameter",
    displayName: "Cylinder bore diameter",
    symbol: "D",
    definition:
      "Candidate cylinder's own catalog bore (piston) diameter. A catalog identity value, not derived (stage-1-spec.md 'Purpose' -- this module checks a cylinder the engineer has already identified by bore/rod/stroke, it does not search a catalog).",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.rod_diameter",
    displayName: "Piston rod diameter",
    symbol: "d",
    definition:
      "Candidate cylinder's own catalog piston rod diameter. Must be smaller than pneumatic.bore_diameter -- enforced by this module's own input schema (Stage 3), not by this registry-level range.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.operating_pressure",
    displayName: "Operating pressure",
    symbol: "P",
    definition:
      "Gauge air supply pressure at the cylinder, after the regulator (SMC's own Air Cylinders Model Selection recommends setting the regulator to 85% of source pressure -- a system-design note, not a value this module derives).",
    valueType: "quantity",
    canonicalUnit: "MPa",
    displayUnits: ["MPa", "bar", "psi"],
    range: { min: 0, unit: "MPa" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.load_factor",
    displayName: "Force sizing load factor",
    symbol: "eta",
    definition:
      "SMC's own load factor (eta), multiplied onto theoretical force (P*A) to obtain the usable cylinder force this module checks against the required force. Required, no built-in default: SMC's own table keys it to operation type (0.7 static/clamping, 1.0 horizontal-guided dynamic, 0.5 vertical/horizontal dynamic, lower still for high speed) and no second source gives a comparable table to cross-check against (stage-2-contract.md 'Decisions' item 1) -- the same 'required input, only one source's own numbers exist to record' treatment bearing.static_safety_factor_minimum already established.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, max: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.required_extend_force",
    displayName: "Required extend-side force",
    symbol: "F_req,ext",
    definition:
      "Engineer-supplied required force on the extend (thrust) stroke, already resolved upstream (this module does not re-derive it from a load mass and an assumed friction coefficient -- Milwaukee Cylinder's own load-type percentage method is documented in stage-1-spec.md as upstream engineering guidance, not a formula this module implements, the same 'engineer already knows the load' treatment coupling 0.1.0 gives screw.drive_torque). Optional at the registry level; this module's own input schema (Stage 3) requires at least one of required_extend_force/required_retract_force.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "pneumatic.required_retract_force",
    displayName: "Required retract-side force",
    symbol: "F_req,ret",
    definition:
      "Engineer-supplied required force on the retract (pull) stroke -- see pneumatic.required_extend_force.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "pneumatic.load_mass",
    displayName: "Moved load mass",
    symbol: "m",
    definition:
      "Mass of the load the piston moves, for the cushion kinetic-energy check (SMC's own E = (m/2)*V^2).",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: [...massDisplay],
    range: { min: 0, unit: "kg" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.max_piston_speed",
    displayName: "Maximum piston speed",
    symbol: "V",
    definition:
      "Piston speed at end of stroke, for the cushion kinetic-energy check. A required engineer-supplied input, never a computed value: both sources read for this module state directly that piston speed cannot be calculated from a formula (stage-1-spec.md 'Purpose') -- Milwaukee Cylinder's own words, 'the exact speed of an air cylinder cannot be calculated,' and SMC's own maximum-speed data is an empirical per-model chart, not a formula.",
    valueType: "quantity",
    canonicalUnit: "m/s",
    displayUnits: ["m/s", "mm/s", "in/s"],
    range: { min: 0, unit: "m/s" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.cushion_type",
    displayName: "End-of-stroke cushion type",
    symbol: "-",
    definition:
      "Which cushion mechanism (if any) the candidate cylinder uses at end of stroke, selecting which catalog allowable-kinetic-energy figure the cushion check reads (SMC's own catalog tables give separate rubber-bumper and air-cushion figures per model).",
    valueType: "enum",
    enumId: "pneumatic_cushion_type",
    enumOptions: ["none", "rubber_bumper", "air_cushion"],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.allowable_kinetic_energy",
    displayName: "Allowable cushion kinetic energy",
    symbol: "E_allow",
    definition:
      "Candidate cylinder's own catalog kinetic-energy absorption capacity for the selected pneumatic.cushion_type (SMC's own per-series, per-bore tables). Required together with a cushion_type other than 'none' -- enforced by this module's own input schema (Stage 3), not this registry-level definition.",
    valueType: "quantity",
    canonicalUnit: "J",
    displayUnits: ["J"],
    range: { min: 0, unit: "J" },
    qualifiers: { bound: "allowable" },
  }),
  defineParameter({
    id: "pneumatic.stroke",
    displayName: "Cylinder stroke",
    symbol: "L",
    definition:
      "Candidate cylinder's own catalog stroke length. Used by the buckling check (unsupported column length) and by the air-consumption/required-air-volume formulas.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.mounting_style",
    displayName: "Cylinder mounting / rod end-fixity style",
    symbol: "fix",
    definition:
      "Euler column end-fixity arrangement of the piston rod under compressive (buckling) load. Textbook physics, not a manufacturer-proprietary fit -- the same 'classic Euler effective-length-factor values' status ball-screw's own screw.end_support_arrangement already established for the identical column-buckling physics on a different component (stage-2-contract.md 'Decisions' item 3) -- but kept as a distinct parameter rather than a reuse of that ID: this registry's own namespacing exists so a resolved value for one physical component (a ball-screw shaft) is never mistaken for a compatible source on an unrelated one (a cylinder's piston rod), the same reasoning motor_sizing.rack_pinion.gear_ratio already gives for not reusing screw.gear_ratio.",
    valueType: "enum",
    enumId: "pneumatic_mounting_style",
    enumOptions: [
      "fixed-fixed",
      "fixed-supported",
      "supported-supported",
      "fixed-free",
    ],
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.buckling_safety_factor",
    displayName: "Buckling safety factor",
    symbol: "S",
    definition:
      "Divisor applied to the theoretical (Euler column) buckling load to obtain the permissible compressive load. Required, no built-in default: no pneumatic-cylinder-manufacturer source read for this module gives a specific value -- only Hänchen's generic, non-pneumatic 'S = 3...5' range (stage-1-spec.md item 4, stage-2-contract.md 'Decisions' item 4) -- so a released run always records which value was actually used, rather than leaving that choice implicit.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 1, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic.piping_length",
    displayName: "Piping length between cylinder and switching valve",
    symbol: "l",
    definition:
      "Length of tubing/steel pipe between the cylinder and its switching valve, for the reported air-consumption figure (SMC's own qp term). Zero (the default) is a structural 'no piping term modeled' statement, not a guessed physical value -- the same category as screw.gear_ratio = 1.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "m"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "mm") },
  }),
  defineParameter({
    id: "pneumatic.piping_bore",
    displayName: "Piping internal bore",
    symbol: "a",
    definition:
      "Internal bore of the tubing/steel pipe between the cylinder and its switching valve. Required together with a nonzero pneumatic.piping_length -- enforced by this module's own input schema (Stage 3).",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm"],
    range: { min: 0, unit: "mm" },
  }),
  defineParameter({
    id: "pneumatic.theoretical_extend_force",
    displayName: "Theoretical extend-side force",
    symbol: "F1",
    definition:
      "pneumatic.load_factor * piston area (extend side) * pneumatic.operating_pressure (SMC's own formula (1), F1 = eta*A1*P). Checked against pneumatic.required_extend_force when supplied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "allowable" },
  }),
  defineParameter({
    id: "pneumatic.theoretical_retract_force",
    displayName: "Theoretical retract-side force",
    symbol: "F2",
    definition:
      "pneumatic.load_factor * piston area (retract side, bore area minus rod area) * pneumatic.operating_pressure (SMC's own formula (2), F2 = eta*A2*P). Checked against pneumatic.required_retract_force when supplied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "allowable" },
  }),
  defineParameter({
    id: "pneumatic.kinetic_energy",
    displayName: "End-of-stroke kinetic energy",
    symbol: "E",
    definition:
      "(pneumatic.load_mass / 2) * pneumatic.max_piston_speed^2 (SMC's own formula (7)). Checked against pneumatic.allowable_kinetic_energy when pneumatic.cushion_type is not 'none'.",
    valueType: "quantity",
    canonicalUnit: "J",
    displayUnits: ["J"],
    range: { min: 0, unit: "J" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "pneumatic.buckling_load",
    displayName: "Theoretical buckling load",
    symbol: "Fk",
    definition:
      "Unfactored theoretical Euler column buckling load of the piston rod, before pneumatic.buckling_safety_factor is applied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
  }),
  defineParameter({
    id: "pneumatic.permissible_compressive_load",
    displayName: "Permissible compressive load",
    symbol: "F_perm",
    definition:
      "pneumatic.buckling_load divided by pneumatic.buckling_safety_factor. Checked against the governing theoretical extend/retract force (whichever side loads the rod in compression).",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "allowable" },
  }),
  defineParameter({
    id: "pneumatic.air_consumption_per_cycle",
    displayName: "Air consumption per cycle",
    symbol: "q",
    definition:
      "Free-air-equivalent volume consumed by the cylinder and its piping over one full stroke cycle (SMC's own formulas (8)-(14)). Reported, not evaluated -- informational for compressor/FRL-equipment sizing outside this module's own scope (stage-1-spec.md 'Validity Envelope').",
    valueType: "quantity",
    canonicalUnit: "L",
    displayUnits: ["L"],
    range: { min: 0, unit: "L" },
  }),
  defineParameter({
    id: "pneumatic.required_air_volume",
    displayName: "Required air volume",
    symbol: "Q",
    definition:
      "Free-air-equivalent volumetric flow rate required to run the cylinder at pneumatic.max_piston_speed (SMC's own formulas (15)-(16), the larger of the extend- and retract-side figures). Reported, not evaluated -- see pneumatic.air_consumption_per_cycle.",
    valueType: "quantity",
    canonicalUnit: "L/min",
    displayUnits: ["L/min"],
    range: { min: 0, unit: "L/min" },
  }),
];

const pneumaticCylinderSizing: readonly ParameterDefinition[] = [
  defineParameter({
    id: "pneumatic_sizing.process_force",
    displayName: "Process force (extend stroke)",
    symbol: "F_proc",
    definition:
      "Additive working force the cylinder must supply on top of the mass-derived load, on the extend (working) stroke only -- e.g. a clamping or pressing force. Zero (the default) is a structural 'no process force' statement, not a guessed physical value -- the same category as pneumatic.piping_length = 0.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "pneumatic_sizing.required_stroke",
    displayName: "Required stroke",
    symbol: "L_req",
    definition:
      "Travel distance the application needs. An application requirement the catalog-matched candidate's own stroke range must cover -- not a catalog identity value the way pneumatic.stroke is in pneumatic-cylinder@0.1.0 (an already-selected cylinder's own printed stroke).",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic_sizing.required_extend_force",
    displayName: "Required extend-side force (computed)",
    symbol: "F_req,ext",
    definition:
      "process_force + load_mass*g*sin(incline_angle) + load_mass*g*friction_coefficient*cos(incline_angle) (this module's own forward-direction convention, reproducing ball-screw-motor-sizing@0.2.0's own resolveDriveForce sign pattern -- stage-2-contract.md Decision 1). Always non-negative by construction, unlike its retract-side counterpart.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "pneumatic_sizing.required_retract_force",
    displayName: "Required retract-side force (computed)",
    symbol: "F_req,ret",
    definition:
      "load_mass*g*friction_coefficient*cos(incline_angle) - load_mass*g*sin(incline_angle) (this module's own return-direction convention -- stage-2-contract.md Decision 1). May be negative for a strongly gravity-assisted return stroke on a heavy unbalanced load, meaning the actuator must resist/brake rather than drive -- reported as computed, never floored here (the catalog matcher floors it at 0 N only when building its own force-capacity criterion, since a negative requirement is not itself a catalog filter).",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    qualifiers: { bound: "required" },
  }),
];

// --- Pneumatic guided cylinder sizing (Unit 7.3 Stage 2) --------------------
// See context/modules/guided-cylinder-sizing/stage-2-contract.md. Mirrors
// pneumaticCylinderSizing's own four force/stroke parameters under a new
// namespace (Decision 1), plus three new unsigned lever-arm inputs and one
// new computed resultant-moment output.

const pneumaticGuidedCylinderSizing: readonly ParameterDefinition[] = [
  defineParameter({
    id: "pneumatic_guided_sizing.process_force",
    displayName: "Process force (extend stroke)",
    symbol: "F_proc",
    definition:
      "Additive working force the cylinder must supply on top of the mass-derived load, on the extend (working) stroke only -- e.g. a clamping or pressing force. Zero (the default) is a structural 'no process force' statement, not a guessed physical value. Mints a new ID rather than reusing pneumatic_sizing.process_force -- stage-2-contract.md Decision 1.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "pneumatic_guided_sizing.required_stroke",
    displayName: "Required stroke",
    symbol: "L_req",
    definition:
      "Travel distance the application needs. An application requirement the catalog-matched MGQ/MGP candidate's own stroke range must cover.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic_guided_sizing.required_extend_force",
    displayName: "Required extend-side force (computed)",
    symbol: "F_req,ext",
    definition:
      "process_force + load_mass*g*sin(incline_angle) + load_mass*g*friction_coefficient*cos(incline_angle) -- identical formula to pneumatic_sizing.required_extend_force, reproduced independently under this module's own namespace (stage-2-contract.md Decision 1). Always non-negative by construction. Also the lateral force this module's own moment resolution converts into roll/pitch/yaw moments (stage-1-spec.md 'Moment Resolution').",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "pneumatic_guided_sizing.required_retract_force",
    displayName: "Required retract-side force (computed)",
    symbol: "F_req,ret",
    definition:
      "load_mass*g*friction_coefficient*cos(incline_angle) - load_mass*g*sin(incline_angle) -- identical formula to pneumatic_sizing.required_retract_force, reproduced independently under this module's own namespace. May be negative for a strongly gravity-assisted return stroke, reported as computed, never floored here.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "pneumatic_guided_sizing.roll_offset",
    displayName: "Roll-axis load offset",
    symbol: "d_roll",
    definition:
      "Unsigned lever-arm distance from the guide plate's own load-reference point to the load's effective center of application, along the roll axis. Used to resolve required_moment (M_roll = required_extend_force * roll_offset) -- stage-2-contract.md Decision 4.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic_guided_sizing.pitch_offset",
    displayName: "Pitch-axis load offset",
    symbol: "d_pitch",
    definition:
      "Unsigned lever-arm distance from the guide plate's own load-reference point to the load's effective center of application, along the pitch axis. See pneumatic_guided_sizing.roll_offset.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic_guided_sizing.yaw_offset",
    displayName: "Yaw-axis load offset",
    symbol: "d_yaw",
    definition:
      "Unsigned lever-arm distance from the guide plate's own load-reference point to the load's effective center of application, along the yaw axis. See pneumatic_guided_sizing.roll_offset.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic_guided_sizing.required_moment",
    displayName: "Required resultant moment (computed)",
    symbol: "M_req",
    definition:
      "sqrt(M_roll^2 + M_pitch^2 + M_yaw^2), where M_roll = required_extend_force*roll_offset (and similarly for pitch/yaw) -- checked against each MGQ/MGP catalog candidate's own single published allowable-rotational-torque-of-plate rating. The Euclidean-sum combination is this module's own engineering assumption: neither fetched SMC catalog documents how to combine independently-computed moments against its one published figure -- stage-2-contract.md Decision 5, a disclosed assumption, not a sourced formula.",
    valueType: "quantity",
    canonicalUnit: "N*m",
    displayUnits: [...torqueDisplay],
    range: { min: 0, unit: "N*m" },
    qualifiers: { bound: "required" },
  }),
];

// --- Dual rod cylinder sizing (Unit 7.4 Stage 2) ----------------------------
// See context/modules/dual-rod-cylinder-sizing/stage-2-contract.md. The
// second of four planned new pneumatic actuator families (after guided-
// cylinder-sizing@0.1.0 guide plate). Reuses the same base trio and
// pneumatic ports pneumatic_sizing.*/pneumatic_guided_sizing.* already
// reuse (motion.axis.incline_angle/friction_coefficient/total_moving_mass,
// pneumatic.operating_pressure/load_factor/cushion_type/max_piston_speed/
// kinetic_energy). Mints new IDs for process_force/required_stroke/
// required_extend_force/required_retract_force rather than reusing either
// sibling module's own analogous parameters -- this registry's own "never
// let a resolved value from one module look like a compatible link
// source for an unrelated one" convention. No pneumatic.mounting_style or
// pneumatic.buckling_safety_factor port: this module has no buckling
// check (stage-1-spec.md "No buckling check for this family"), the one
// genuine scope difference from both sibling modules.
const dualRodSizing: readonly ParameterDefinition[] = [
  defineParameter({
    id: "dual_rod_sizing.process_force",
    displayName: "Process force (extend stroke)",
    symbol: "F_proc",
    definition:
      "Additive working force the cylinder must supply on top of the mass-derived load, on the extend (working) stroke only -- e.g. a clamping or pressing force. Zero (the default) is a structural 'no process force' statement, not a guessed physical value. Mints a new ID rather than reusing pneumatic_sizing.process_force or pneumatic_guided_sizing.process_force -- stage-2-contract.md Decision 3.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "dual_rod_sizing.required_stroke",
    displayName: "Required stroke",
    symbol: "L_req",
    definition:
      "Travel distance the application needs. An application requirement the catalog-matched CXS2 candidate's own stroke range must cover, and one of the two inputs (with max_piston_speed) that selects which seeded load-mass-vs-overhang band applies.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "dual_rod_sizing.required_extend_force",
    displayName: "Required extend-side force (computed)",
    symbol: "F_req,ext",
    definition:
      "Required cylinder force on the extend (working) stroke: additive process force plus the incline/friction-resolved load force. Computed by this module from load_mass, incline_angle, friction_coefficient, and process_force -- not engineer-supplied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "dual_rod_sizing.required_retract_force",
    displayName: "Required retract-side force (computed)",
    symbol: "F_req,ret",
    definition:
      "Required cylinder force on the retract (return) stroke: the incline/friction-resolved load force only (no process force). May be negative for a strongly gravity-assisted return stroke, meaning the actuator must resist/brake rather than drive -- reported as computed, not floored. Computed by this module, not engineer-supplied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "dual_rod_sizing.overhang_length",
    displayName: "Overhang length",
    symbol: "L_oh",
    definition:
      "Lever arm from the dual-rod cylinder's own end-plate load-reference point to the load's center of gravity (SMC's own 'Overhang L'). Governs the load-mass-vs-overhang-length structural check unique to this twin-guide-rod mechanism -- no natural zero-default, required (stage-2-contract.md Decision 5).",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "dual_rod_sizing.mounting_orientation",
    displayName: "Mounting orientation",
    symbol: "orient",
    definition:
      "Installation orientation relative to gravity, restricted to the two values SMC's own CXS2 'Model Selection' load-mass-vs-overhang graphs are keyed by. Deliberately not a reuse of motion.axis.orientation (horizontal/vertical/inclined): CXS2's own selection graphs have no 'inclined' bucket, so reusing the three-value enum would admit a value with no seeded band behind it (stage-2-contract.md Decision 4).",
    valueType: "enum",
    enumId: "dual_rod_mounting_orientation",
    enumOptions: ["vertical", "horizontal"],
    defaultPolicy: { kind: "required" },
  }),
];

/** All released parameter definitions for registry v1.19, in authored order. */
export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = [
  ...projectAndEnvironment,
  ...axisApplication,
  ...motionProfile,
  ...ballScrew,
  ...linearGuide,
  ...coupling,
  ...supportBearing,
  ...driveTrain,
  ...motorSizingBallScrew,
  ...motorSizingDirectDriveConveyor,
  ...motorSizingRackPinion,
  ...motorSizingBeltPulley,
  ...motorSizingIndexTable,
  ...pneumaticCylinder,
  ...pneumaticCylinderSizing,
  ...pneumaticGuidedCylinderSizing,
  ...dualRodSizing,
];
