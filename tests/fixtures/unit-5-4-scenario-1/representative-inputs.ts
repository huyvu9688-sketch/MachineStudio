// Unit 5.4 ("End-to-end MVP validation"), Scenario 1: horizontal linear
// axis. Port-level input values for a real, live-database run of the
// complete `linear-axis@1.0.0` guided workflow (all seven modules), used by
// `lib/application/workflows/unit-5-4-scenario-1-horizontal-axis.test.ts`.
// See `validation/unit-5.4/scenario-1-horizontal-axis.md` for the full
// evidence record this fixture supports.
//
// PROVENANCE. Every value below is tagged in its own comment:
//
//   id39          - taken directly from the historical fixture
//                   tests/fixtures/axes/axis-horizontal-basic/fixture.ts
//                   (sanitized source case ID39), or the same local
//                   convention lib/modules/axis-load-cases/0.1.0/
//                   package.test.ts's own `historicalInput()` already uses
//                   for the two fields ID39 does not state a sign/magnitude
//                   for (travel direction, guide resistance force).
//   derived       - computed from ID39's own stated numbers by ordinary
//                   kinematics/arithmetic, not itself printed by the source.
//   representative:<source> - a real, cited, already-vetted value taken from
//                   this project's own manufacturer reference-example file
//                   for that module (not sourced from ID39 at all - ID39
//                   supplies no catalog data for ball-screw, linear-guide,
//                   coupling, support-bearing, or drive-train).
//   representative:placeholder - a plausible catalog-shaped value chosen (in
//                   most cases with headroom, hand-verified against each
//                   module's own math.ts formulas before this file was
//                   written) so the scenario completes successfully, the
//                   same disclosed-placeholder practice
//                   lib/modules/coupling/0.1.0/rw-reference-examples.ts and
//                   lib/modules/support-bearing/0.1.0/nsk-reference-
//                   examples.ts already use for their own unsourced ports.
//
// KNOWN, DISCLOSED INCONSISTENCY. These five reference examples come from
// five unrelated real machines (a Rockford/THK-style catalog screw
// baseline, PMI's own Chapter 9 guide, R+W's own ST2/10 coupling, NSK's own
// bearing 6208, and a placeholder servo motor), so stitching them onto one
// axis does not describe one coherent real machine: the screw's own
// unsupported length (0.4 m, chosen only for critical-speed margin at this
// scenario's own 6000 rpm operating speed) is shorter than both the guide's
// own PMI-sourced block spacing (0.65 m) and the motion-profile-derived
// stroke (1.89 m). No check in `linear-axis@1.0.0` enforces stroke-vs-
// screw-length or block-spacing-vs-screw-length consistency (only
// `motion.axis.orientation`, `screw.lead`, and `screw.gear_ratio` are
// cross-checked - lib/workflows/linear-axis/1.0.0/definition.ts), so
// nothing fails on this account, but it is a real layout inconsistency
// between independently-sourced figures, not a hidden one. This scenario
// demonstrates the workflow carrying ID39's own real axis-load physics
// through a complete, checked part selection - it is not a real historical
// machine's own complete bill of materials.
//
// A second, narrower disclosure: the coupling (R+W's own ST2/10, rated for
// a 450 kW/980 rpm industrial drive) is drastically oversized for this
// axis's own ~1 N*m torque - reused because it is this project's own
// richest already-vetted `executeModule`-level coupling reference, not
// because it is a plausible real selection for this axis.

import { makeQuantity, SERIALIZATION_FORMAT_VERSION } from "@/lib/engine";
import type { EngineeringValue, EnumValue } from "@/lib/engine";

const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;

function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

/**
 * ID39's own reported axial-force magnitudes and tolerances (`tests/
 * fixtures/axes/axis-horizontal-basic/fixture.ts`), reproduced here only
 * for the test's own "difference and explanation" assertions - the fixture
 * file itself remains the one authoritative, hash-pinned copy.
 */
export const ID39_REFERENCE = {
  /** Acceleration phase - this scenario's "peak" case. */
  accelerationForceN: { value: 274, toleranceN: 3 },
  /** Constant-speed phase - this scenario's "normal" case. */
  constantSpeedForceN: { value: 8, toleranceN: 1 },
  /** Deceleration phase - not separately reproduced (0.1.0 is normal/peak only). */
  decelerationForceN: { value: 260, toleranceN: 3 },
  /** Downstream reference value; not reproduced by any released module. */
  meanAxialLoadN: { value: 200, toleranceN: 1 },
  /** ID39's own stated cycle time, s - cross-checked against the derived motion-profile input below. */
  cycleTimeS: 4.1,
  /** ID39's own stated moving time, s. */
  movingTimeS: 2.04,
} as const;

// --- linear-axis.axis: axis-load-cases@0.1.0 --------------------------------
//
// Every value here is id39 or the same "positive"/"0 N" local convention
// lib/modules/axis-load-cases/0.1.0/package.test.ts's own historicalInput()
// already uses for the two fields ID39 does not state
// (travel_direction, guide_resistance_force). "peak" is assigned the
// acceleration phase (274 N, the larger of the two transient magnitudes);
// "normal" is assigned the constant-speed phase (8 N, the steady running
// condition) - axis-load-cases 0.1.0 models only two cases, so ID39's third
// phase (deceleration, 260 N) is not separately reproduced, a disclosed
// scope limit, not a discrepancy.
// orientation is NOT set here: linear-axis@1's own `shared-orientation`
// workflow check requires axis and guide to each link the SAME source, not
// merely hold matching manual values (lib/workflows/linear-axis/1.0.0/
// definition.ts) - see SHARED_ASSEMBLY_VALUES below.
export const AXIS_INPUTS: Record<string, EngineeringValue> = {
  incline_angle: makeQuantity(0, "rad"), // id39
  total_moving_mass: makeQuantity(40, "kg"), // id39
  friction_coefficient: makeQuantity(0.02, "ratio"), // id39
  gravity: makeQuantity(9.8, "m/s^2"), // id39 (source-stated; not the registry's 9.80665 default)
  normal_travel_direction: enumValue("axis_travel_direction", "positive"), // id39 (local convention)
  normal_axial_acceleration: makeQuantity(0, "m/s^2"), // id39
  normal_guide_resistance_force: makeQuantity(0, "N"), // id39 (local convention)
  peak_travel_direction: enumValue("axis_travel_direction", "positive"), // id39 (local convention)
  peak_axial_acceleration: makeQuantity(6.666666666666667, "m/s^2"), // id39
  peak_guide_resistance_force: makeQuantity(0, "N"), // id39 (local convention)
};

// --- linear-axis.motion: motion-profile@0.1.0 -------------------------------
//
// move_1_distance and dwell_1_time are derived, not printed: ID39 states
// velocity/acceleration/duration per phase, not a move distance.
// accel = 0.5*1*0.15 = 0.075 m; constant = 1*(2.04-0.15-0.15) = 1.74 m;
// decel = 0.5*1*0.15 = 0.075 m; total = 1.89 m. The three phase times sum to
// exactly ID39's own stated movingTime (2.04 s), and
// move_time (2.04 s) + dwell_1_time (2.06 s) reproduces ID39's own stated
// cycleTime (4.1 s) exactly - a strong internal cross-check, not a
// coincidence of rounding.
export const MOTION_INPUTS: Record<string, EngineeringValue> = {
  move_1_distance: makeQuantity(1.89, "m"), // derived
  move_1_max_velocity: makeQuantity(1, "m/s"), // id39
  move_1_max_acceleration: makeQuantity(6.666666666666667, "m/s^2"), // id39
  dwell_1_time: makeQuantity(2.06, "s"), // derived
};

// --- linear-axis.screw: ball-screw@0.1.0 ------------------------------------
//
// Reuses lib/modules/ball-screw/0.1.0/package.test.ts's own baselineInput()
// almost verbatim (its own comment already calls these "round engineering
// numbers, not a published worked example") - the module's own already-
// passing internal reference, not a specific manufacturer catalog part.
// unsupported_length is shortened from that baseline's own 1 m to 0.4 m:
// at this scenario's own ~6000 rpm operating speed (v=1 m/s, lead=0.01 m),
// the baseline's 1 m unsupported length would fail the critical-speed check
// (permissible speed ~2840 rpm); 0.4 m gives a permissible speed of
// ~17,800 rpm, a comfortable margin. Every other check (static safety,
// buckling) passes by a wide margin regardless, since ID39's own thrust
// forces (8 N / 274 N) are tiny next to this baseline's 20,000/40,000 N
// catalog ratings.
// lead and gear_ratio are NOT set here: they are shared across screw,
// coupling, bearing, and/or drive, and linear-axis@1's own `shared-lead`/
// `shared-gear-ratio` checks require every consuming instance to link the
// SAME source, not merely hold matching manual values - see
// SHARED_ASSEMBLY_VALUES below.
export const SCREW_INPUTS: Record<string, EngineeringValue> = {
  minor_diameter: makeQuantity(0.02, "m"), // representative:module-baseline
  unsupported_length: makeQuantity(0.4, "m"), // representative:placeholder (shortened for critical-speed margin - see above)
  end_support_arrangement: enumValue(
    "screw_end_support_arrangement",
    "fixed-supported",
  ), // representative:module-baseline
  dynamic_load_rating: makeQuantity(20000, "N"), // representative:module-baseline
  dynamic_load_rating_basis: enumValue(
    "screw_dynamic_load_rating_basis",
    "revolutions",
  ), // representative:module-baseline
  static_load_rating: makeQuantity(40000, "N"), // representative:module-baseline
  preload: makeQuantity(500, "N"), // representative:module-baseline
  internal_friction_coefficient: makeQuantity(0.2, "ratio"), // representative:module-baseline
  mechanical_efficiency: makeQuantity(0.9, "ratio"), // representative:module-baseline
  static_safety_factor_minimum: makeQuantity(1.5, "ratio"), // representative:module-baseline
  buckling_safety_margin: makeQuantity(0.5, "ratio"), // representative:module-baseline
  // Time fraction of the 4.1 s cycle each case represents: normal (constant-
  // speed phase) = 1.74/4.1; peak (acceleration phase) = 0.15/4.1. derived.
  normal_time_fraction: makeQuantity(1.74 / 4.1, "ratio"), // derived
  normal_linear_velocity: makeQuantity(1, "m/s"), // id39
  peak_time_fraction: makeQuantity(0.15 / 4.1, "ratio"), // derived
  peak_linear_velocity: makeQuantity(1, "m/s"), // id39
  // normal_thrust_force / peak_thrust_force: linked from axis-load-cases.
};

// --- linear-axis.guide: linear-guide@0.1.0 ----------------------------------
//
// lib/modules/linear-guide/0.1.0/pmi-chapter-9.ts's own PMI_EXAMPLE
// (PMI's own published Chapter 9 worked example, model
// `MSA35LA2SSFC + R2520-20/20 P II`). block_spacing/rail_spacing are PMI's
// own `l1`/`l2` (carriage spacing along travel / transverse rail spacing -
// see that file's own header on getting the pair right). preload_grade
// (PMI states none) and static_safety_factor_minimum reuse this module's
// own package.test.ts baseline. The resolved load at this scenario's own
// scale (~392 N, weight only - ID39 states no center-of-mass offset or
// external load) is trivial next to PMI's own 100,600 N static rating.
// orientation is NOT set here - see AXIS_INPUTS's own header note above.
export const GUIDE_INPUTS: Record<string, EngineeringValue> = {
  rail_spacing: makeQuantity(0.45, "m"), // representative:pmi (PMI's l2)
  block_spacing: makeQuantity(0.65, "m"), // representative:pmi (PMI's l1)
  static_load_rating: makeQuantity(100600, "N"), // representative:pmi
  dynamic_load_rating: makeQuantity(63600, "N"), // representative:pmi
  rolling_element_type: enumValue("guide_rolling_element_type", "ball"), // representative:pmi
  preload_grade: enumValue("guide_preload_grade", "light"), // representative:module-baseline (PMI states no grade)
  load_factor: makeQuantity(1.5, "ratio"), // representative:pmi
  static_safety_factor_minimum: makeQuantity(1.3, "ratio"), // representative:module-baseline
  // normal/peak_resultant_force, normal/peak_resultant_moment: linked from axis-load-cases.
};

// --- linear-axis.coupling: coupling@0.1.0 -----------------------------------
//
// lib/modules/coupling/0.1.0/rw-reference-examples.ts's own RW_EXAMPLE_1
// (R+W America's own "Sizing and Selection" Example 1, selected coupling
// ST2/10). allowable_speed is overridden from R+W's own printed 1500 rpm
// placeholder to 8000 rpm: this scenario's own operating speed (v=1 m/s,
// lead=0.01 m -> 6000 rpm) exceeds 1500 rpm outright, a scenario-specific
// override disclosed here, not an R+W-sourced figure. The coupling itself
// (rated 6030 N*m) is drastically oversized for this axis's own ~1 N*m
// torque - see this file's own header.
// lead and gear_ratio are NOT set here - see SCREW_INPUTS's own header note above.
export const COUPLING_INPUTS: Record<string, EngineeringValue> = {
  rated_torque: makeQuantity(6030, "N*m"), // representative:rw
  max_torque: makeQuantity(50000, "N*m"), // representative:rw
  allowable_speed: makeQuantity(8000 * RPM_TO_RAD_PER_S, "rad/s"), // representative:placeholder (overridden from R+W's own 1500 rpm - see above)
  torsional_stiffness: makeQuantity(50000, "N*m/rad"), // representative:rw
  moment_of_inertia: makeQuantity(0.05, "kg*m^2"), // representative:rw
  driving_bore_min: makeQuantity(0.05, "m"), // representative:rw
  driving_bore_max: makeQuantity(0.12, "m"), // representative:rw
  driven_bore_min: makeQuantity(0.05, "m"), // representative:rw
  driven_bore_max: makeQuantity(0.12, "m"), // representative:rw
  allowable_parallel_misalignment: makeQuantity(0.001, "m"), // representative:rw
  allowable_angular_misalignment: makeQuantity(0.02, "rad"), // representative:rw
  allowable_axial_misalignment: makeQuantity(0.001, "m"), // representative:rw
  actual_parallel_misalignment: makeQuantity(0.0002, "m"), // representative:rw
  actual_angular_misalignment: makeQuantity(0.005, "rad"), // representative:rw
  actual_axial_misalignment: makeQuantity(0.0001, "m"), // representative:rw
  driving_shaft_diameter: makeQuantity(0.08, "m"), // representative:rw
  driven_shaft_diameter: makeQuantity(0.08, "m"), // representative:rw
  service_factor: makeQuantity(1.25 * 1.1 * 1.0, "ratio"), // representative:rw
  normal_linear_velocity: makeQuantity(1, "m/s"), // id39 (not linked - coupling has no linkRule for this parameter)
  peak_linear_velocity: makeQuantity(1, "m/s"), // id39
  // normal/peak_drive_torque: linked from ball-screw.
};

// --- linear-axis.bearing (fixed): support-bearing@0.1.0 ---------------------
//
// lib/modules/support-bearing/0.1.0/nsk-reference-examples.ts's own
// NSK_EXAMPLE_3 (NSK's own "Rolling Bearings" Example 3, bearing 6208,
// radial + axial load, the module's own "fixed"-location branch).
// lead is NOT set here - see SCREW_INPUTS's own header note above.
export const BEARING_FIXED_INPUTS: Record<string, EngineeringValue> = {
  location: enumValue("bearing_location", "fixed"), // derived (scenario design choice)
  dynamic_load_rating: makeQuantity(29100, "N"), // representative:nsk (bearing 6208 Cr)
  static_load_rating: makeQuantity(17900, "N"), // representative:nsk (bearing 6208 C0r)
  allowable_speed: makeQuantity(10000, "rad/s"), // representative:placeholder (NSK's own disclosed permissive placeholder)
  dynamic_load_factor_x: makeQuantity(0.56, "ratio"), // representative:nsk
  dynamic_load_factor_y: makeQuantity(1.67, "ratio"), // representative:nsk
  static_load_factor_x: makeQuantity(0.6, "ratio"), // representative:placeholder (NSK's own disclosed placeholder)
  static_load_factor_y: makeQuantity(0.5, "ratio"), // representative:placeholder
  bore_diameter: makeQuantity(0.04, "m"), // representative:nsk (bearing 6208 standard JIS/ISO bore)
  outside_diameter: makeQuantity(0.08, "m"), // representative:nsk (bearing 6208 standard JIS/ISO OD)
  static_safety_factor_minimum: makeQuantity(1, "ratio"), // representative:placeholder (NSK's own disclosed placeholder)
  normal_actual_radial_load: makeQuantity(2500, "N"), // representative:nsk
  normal_linear_velocity: makeQuantity(1, "m/s"), // id39
  peak_actual_radial_load: makeQuantity(2500, "N"), // representative:nsk
  peak_linear_velocity: makeQuantity(1, "m/s"), // id39
  // normal/peak_thrust_force: linked from axis-load-cases (required when location = "fixed").
};

// --- linear-axis.bearing (supported): support-bearing@0.1.0 -----------------
//
// lib/modules/support-bearing/0.1.0/nsk-reference-examples.ts's own
// NSK_EXAMPLE_1 (NSK's own Example 1, bearing 6208, pure radial load, the
// module's own "supported"-location branch). Same catalog ratings/bore as
// the fixed instance above (the same physical bearing family). The
// axis-thrust-to-bearing linkRule structurally proposes a link to this
// instance too (support-bearing@0.1.0's manifest declares
// `${loadCase}_thrust_force` unconditionally, even though only "fixed"
// requires it - lib/modules/support-bearing/0.1.0/manifest.ts), so it is
// confirmed for workflow completion even though compute.ts's own
// "supported" branch ignores the resolved value.
// lead is NOT set here - see SCREW_INPUTS's own header note above.
export const BEARING_SUPPORTED_INPUTS: Record<string, EngineeringValue> = {
  location: enumValue("bearing_location", "supported"), // derived
  dynamic_load_rating: makeQuantity(29100, "N"), // representative:nsk
  static_load_rating: makeQuantity(17900, "N"), // representative:nsk
  allowable_speed: makeQuantity(10000, "rad/s"), // representative:placeholder
  dynamic_load_factor_x: makeQuantity(1, "ratio"), // representative:nsk (X=1 pure-radial reduction)
  static_load_factor_x: makeQuantity(0.6, "ratio"), // representative:placeholder
  bore_diameter: makeQuantity(0.04, "m"), // representative:nsk
  outside_diameter: makeQuantity(0.08, "m"), // representative:nsk
  static_safety_factor_minimum: makeQuantity(1, "ratio"), // representative:placeholder
  normal_actual_radial_load: makeQuantity(2500, "N"), // representative:nsk
  normal_linear_velocity: makeQuantity(1, "m/s"), // id39
  peak_actual_radial_load: makeQuantity(2500, "N"), // representative:nsk
  peak_linear_velocity: makeQuantity(1, "m/s"), // id39
  // normal/peak_thrust_force: linked from axis-load-cases (unused by compute for "supported" - see above).
};

// --- linear-axis.drive: drive-train@0.1.0 -----------------------------------
//
// A plausible small-servo catalog motor, sized with hand-verified headroom
// on all four checks (inertia ratio, RMS torque, peak torque, speed)
// against this scenario's own actual computed values - not a specific
// manufacturer SKU. Neither of this module's own existing reference motors
// (Omron's real R88M-U20030, rated 3000 rpm/0.637 N*m; THK's own two
// plausible placeholders, also rated 3000 rpm) supports this scenario's own
// ~6000 rpm operating speed (v=1 m/s, lead=0.01 m) or its own ~0.65 N*m
// load torque at that lead without a genuine sizing failure, so this is a
// new placeholder rather than an override of either, disclosed as such
// throughout rather than mislabeled as one of those two sources.
// reflected_load_inertia is derived from this scenario's own moving mass
// and lead (J = m*(lead/2*pi)^2 = 40*(0.01/2*pi)^2 = 1.0124e-4 kg*m^2, the
// standard translating-to-rotary reflected-inertia relation), not carried
// over from Omron's own 1.63e-4 kg*m^2 (sized for their own 5 kg example).
// lead and gear_ratio are NOT set here - see SCREW_INPUTS's own header note above.
export const DRIVE_INPUTS: Record<string, EngineeringValue> = {
  motor_rated_torque: makeQuantity(1.5, "N*m"), // representative:placeholder
  motor_peak_torque: makeQuantity(4.5, "N*m"), // representative:placeholder
  motor_rated_speed: makeQuantity(7000 * RPM_TO_RAD_PER_S, "rad/s"), // representative:placeholder
  motor_rotor_inertia: makeQuantity(4e-5, "kg*m^2"), // representative:placeholder
  reflected_load_inertia: makeQuantity(1.0124e-4, "kg*m^2"), // derived (m*(lead/2*pi)^2 - see above)
  rms_torque_margin: makeQuantity(0.8, "ratio"), // representative:placeholder
  peak_torque_margin: makeQuantity(0.8, "ratio"), // representative:placeholder
  inertia_ratio_maximum: makeQuantity(30, "ratio"), // representative:placeholder
  normal_linear_velocity: makeQuantity(1, "m/s"), // id39
  peak_linear_velocity: makeQuantity(1, "m/s"), // id39
  // peak_acceleration/peak_deceleration/rms_acceleration: linked from motion-profile.
  // normal/peak_drive_torque: linked from ball-screw.
};

// --- Shared assembly-scoped values -------------------------------------
//
// `motion.axis.orientation`, `screw.lead`, and `screw.gear_ratio` are each
// used by more than one role instance, and none of `linear-axis@1.0.0`'s
// own `linkRules` wires them (lib/workflows/linear-axis/1.0.0/
// definition.ts's own header: "these are ordinary assembly-scoped values...
// resolved by Unit 1.8's nearest-scope suggestion engine, not module-to-
// module links"). The workflow's own `shared_value_topology` check rules
// (`shared-orientation`, `shared-lead`, `shared-gear-ratio`) require every
// consuming instance to hold a CONFIRMED LINK to the same source - matching
// manual values on each instance independently does not satisfy them (a
// manual entry "cannot be proven consistent with the others," per that
// check's own message). So the test sets each of these once as an
// `assembly_parameter` value and confirms a link from that one source to
// every consuming instance's own port, rather than including them in any
// per-instance *_INPUTS record above.
export const SHARED_ASSEMBLY_VALUES: Record<
  string,
  { readonly value: EngineeringValue; readonly portKey: string }
> = {
  "motion.axis.orientation": {
    value: enumValue("axis_orientation", "horizontal"), // id39
    portKey: "orientation",
  },
  "screw.lead": {
    value: makeQuantity(0.01, "m"), // representative:module-baseline (shared across screw/coupling/bearing/drive)
    portKey: "lead",
  },
  "screw.gear_ratio": {
    value: makeQuantity(1, "ratio"), // derived (explicit direct-connected value, not the registry default, so the shared-gear-ratio check has a real linked value to compare)
    portKey: "gear_ratio",
  },
};
