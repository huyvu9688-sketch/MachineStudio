// THK Co., Ltd.'s own two published worked examples ("Examples of Selecting
// a Ball Screw," THK Ball Screw General Catalog) reproduced through this
// module's ACTUAL compute path (executeModule), not just the kernel formula
// level -- the same higher bar ./package.test.ts's own Omron reproduction
// already uses. Source: jp.thk.example_ball_screw_selection@technico-mirror-
// 2026-08-10 (lib/standards/engineering-sources.ts). Read directly this
// session (`pdftotext -layout` against the registered technico.com mirror,
// physical PDF pages 449-467 of 488), not recalled from
// drive-train@0.1.0's own doc comments -- this module needs the exact
// per-phase algebra (six signed axial-load phases per example), which
// drive-train never needed since it takes load torque as a given input
// rather than computing it from mass/friction/orientation itself.
//
// **A genuine finding from reading the primary source directly, recorded
// here rather than silently assumed:** THK's own vertical example shows
// gravity's own axial contribution ((m1+m2)*g = 490 N) appearing as an
// IDENTICAL additive term in all six moving-phase axial loads (585, 510,
// 435, 395, 470, 545 N) -- it does not flip sign between the upward and
// downward halves of the cycle. Only the guide-surface-resistance term
// (f = 20 N, a flat force, not a friction coefficient) and the inertial
// term ((m1+m2)*alpha) flip. This module's own resolveDriveForce (./math.ts)
// DOES flip gravity's own sign between "forward" and "return" -- but this
// is NOT a bug: resolveDriveForce computes a SIGNED force expressed
// relative to "how hard the screw drives in its own current direction of
// travel" (the same convention lib/modules/axis-load-cases/0.1.0/math.ts's
// own resolveAxisLoadPhase reduces to once its fixed-frame gravity vector
// and direction-flipping resistanceForce are projected onto one travel
// direction), which is mathematically the CORRECT transform of THK's own
// fixed-frame formula -- verified by hand this session: feeding THK's own
// "guide resistance" f = 20 N as this module's OWN (direction-independent)
// external_force input, resolveDriveForce's return-direction force comes
// out to -470 N (SIGNED: a negative "how hard the screw drives forward-into-
// return" figure), and 470 N is exactly THK's own printed Fa5 magnitude.
// THK's own printed T1/T2/Tk1/Tk2/Tg1/Tg2 are all reported as UNSIGNED
// magnitudes (the correct convention for a motor torque-RATING selection
// guide, where a servo motor must be sized for a torque magnitude
// regardless of whether that phase is nominally driving or braking) --
// and this module's own resolveMomentaryTorque (Math.abs) and
// resolveEffectiveTorque (squares every term) are ALREADY sign-agnostic,
// so the signed/unsigned convention difference washes out completely by
// the time it reaches momentary_torque/effective_torque. Confirmed to full
// precision below (each phase reproduces THK's own printed figure to within
// ~1%, consistent with THK's own rounding of intermediate figures like
// alpha).
//
// **Screw mass is derived, not printed.** THK gives each example's screw
// shaft as a linear inertia-density constant (kg*cm^2/mm) times length, not
// a mass+diameter pair -- a different parameterization than this module's
// own screw_diameter/screw_mass inputs need (Omron's own example, by
// contrast, printed mass and diameter directly). Both examples' own printed
// shaft diameter (20mm horizontal, 15mm vertical) IS printed directly;
// mass is back-solved from THK's own printed screw inertia at that
// diameter via this module's own solidCylinderInertia formula
// (J = M*D^2/8), then cross-checked by hand this session against a plain
// solid steel cylinder at 7850 kg/m^3 -- both examples agree with the
// steel-cylinder mass to within 1%, strong evidence the derived mass is
// physically consistent with THK's own printed inertia, not an arbitrary
// fit.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

// --- Example 1: High-speed Transfer Equipment (Horizontal Use) -------------
//
// Selection conditions (printed): table mass m1=60 kg, work mass m2=20 kg
// (total moving mass 80 kg), stroke S=1000 mm, max speed Vmax=1 m/s,
// accel/decel time t1=t3=0.15 s, no gearbox (direct coupling), motor rated
// speed 3000 min^-1, motor rotor inertia Jm=1e-3 kg*m^2. Selected screw:
// WTF2040-2 (shaft diameter 20mm, lead Ph=40mm, overall length 1200mm) --
// the same model axis-load-cases'/ball-screw's/drive-train's own fixtures
// already cite.
//
// "Studying the Permissible Axial Load" (printed): six signed axial-load
// phases (forward accel/uniform/decel, backward accel/uniform/decel) =
// 550, 17, -516, -550, -17, 516 N -- all pure friction (no gravity
// component; horizontal). Forward/backward uniform-motion magnitude
// (17 N) is friction only: 17 = mu*(m1+m2)*g, giving mu = 17/(80*9.8).
//
// "Studying the Rotational Torque" (printed): friction torque T1=120 N*mm;
// screw inertia JB=1.48e-4 kg*m^2 (from a 1.23e-3 kg*cm^2/mm linear density
// over 1200mm); reflected load inertia (screw+load, before motor)
// J=3.39e-3 kg*m^2; angular acceleration alpha=1050 rad/s^2 (THK's own
// rounded figure; the exact value from Vmax/lead*2*pi/t1 is 1047.2 rad/s^2,
// used here instead -- the same substitution drive-train@0.1.0's own
// thk-reference-examples.ts already documents for this identical example);
// acceleration torque T2=4.61 N*m; maximum torque during acceleration
// Tk=4730 N*mm; during deceleration Tg=-4490 N*mm; during uniform motion
// Tt=120 N*mm.
//
// "Studying the Driving Motor" (printed): Tmax=4730 N*mm (instantaneous
// maximum); over four phases (accel 0.15s, uniform 0.85s, decel 0.15s,
// stationary 2.6s), Trms=1305 N*mm.
//
// This module's own round-trip shape (forward move, optional return, dwell)
// models this as a forward-only cycle with the stationary phase folded into
// dwell_time -- THK's own document treats this as a single repeating
// one-way move (load torque is direction-independent on a horizontal axis,
// so a distinct return-move phase would be numerically redundant, not a
// different scenario) -- the same "forward move + dwell, no return
// declared" shape ./package.test.ts's own Omron reproduction already uses.
export const THK_HORIZONTAL_TOTAL_MASS_KG = 80;
export const THK_HORIZONTAL_FRICTION_COEFFICIENT = 17 / (80 * 9.8);
export const THK_HORIZONTAL_SCREW_DIAMETER_M = 0.02;
// Derived: J_B(target)=1.48e-4 kg*m^2 = (1/8)*M*D^2 at D=0.02m -> M=2.96 kg.
// Cross-check: a solid steel cylinder (7850 kg/m^3) 20mm dia x 1200mm long
// has mass 7850*pi*0.01^2*1.2 = 2.96 kg -- exact agreement.
export const THK_HORIZONTAL_SCREW_MASS_KG = 2.96;
export const THK_HORIZONTAL_LEAD_M = 0.04;
export const THK_HORIZONTAL_LOAD_TORQUE_NM = 0.12;
export const THK_HORIZONTAL_MOMENTARY_TORQUE_NM = 4.73;
export const THK_HORIZONTAL_EFFECTIVE_TORQUE_NM = 1.305;
export const THK_HORIZONTAL_LOAD_INERTIA_KG_M2 = 3.39e-3;
export const THK_HORIZONTAL_MOTOR_ROTOR_INERTIA_KG_M2 = 1e-3;

export const THK_HORIZONTAL_REFERENCE_EXAMPLE: RawInput = {
  values: {
    orientation: {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "horizontal",
    },
    incline_angle: makeQuantity(0, "rad"),
    friction_coefficient: makeQuantity(
      THK_HORIZONTAL_FRICTION_COEFFICIENT,
      "ratio",
    ),
    total_moving_mass: makeQuantity(THK_HORIZONTAL_TOTAL_MASS_KG, "kg"),
    lead: makeQuantity(THK_HORIZONTAL_LEAD_M, "m"),
    preload: makeQuantity(0, "N"),
    internal_friction_coefficient: makeQuantity(0, "ratio"),
    mechanical_efficiency: makeQuantity(0.9, "ratio"),
    screw_diameter: makeQuantity(THK_HORIZONTAL_SCREW_DIAMETER_M, "m"),
    screw_mass: makeQuantity(THK_HORIZONTAL_SCREW_MASS_KG, "kg"),
    forward_move_distance: makeQuantity(1.0, "m"),
    forward_max_velocity: makeQuantity(1.0, "m/s"),
    forward_max_acceleration: makeQuantity(1 / 0.15, "m/s^2"),
    dwell_time: makeQuantity(2.6, "s"),
    motor_rotor_inertia: makeQuantity(
      THK_HORIZONTAL_MOTOR_ROTOR_INERTIA_KG_M2,
      "kg*m^2",
    ),
    // THK's own text states each requirement as a plain "must be at least"
    // minimum -- no derating factor given, so both margins are 1.0, the
    // same treatment drive-train@0.1.0's own thk-reference-examples.ts
    // already established for this identical example.
    effective_torque_safety_factor: makeQuantity(1, "ratio"),
    momentary_torque_safety_factor: makeQuantity(1, "ratio"),
    // THK's own "at least one tenth" rule: J_motor >= J_load/10.
    inertia_ratio_maximum: makeQuantity(10, "ratio"),
  },
};

// --- Example 2: Vertical Conveyance System ----------------------------------
//
// Selection conditions (printed): table mass m1=40 kg, work mass m2=10 kg
// (total moving mass 50 kg), stroke S=600 mm, max speed Vmax=0.3 m/s,
// accel/decel time t1=t3=0.2 s, no gearbox, motor rated speed 3000 min^-1,
// motor rotor inertia Jm=5e-5 kg*m^2, frictional coefficient of the guide
// surface mu=0.003 (rolling; not used by the printed formula below -- see
// the module doc comment above), guide surface resistance f=20 N. Selected
// screw: BLK1510-5.6 (shaft diameter 15mm, lead Ph=10mm, overall length
// 800mm).
//
// "Studying the Permissible Axial Load" (printed): Fa1..Fa6 (upward
// accel/uniform/decel, downward accel/uniform/decel) = 585, 510, 435, 395,
// 470, 545 N -- every one of the form (m1+m2)*g +/- f +/- (m1+m2)*alpha,
// with (m1+m2)*g=490N appearing unsigned in all six (g=9.8 m/s^2 exactly,
// not this project's own 9.80665 registry default -- used explicitly here
// to match THK's own printed arithmetic, the same treatment
// ./package.test.ts's own Omron reproduction already gives gravityMps2).
//
// "Studying the Rotational Torque" (printed): T1=900 N*mm (upward friction
// torque, from Fa2=510), T2=830 N*mm (downward friction torque, from
// Fa5=470); screw inertia JS=3.12e-5 kg*m^2 (from a 3.9e-4 kg*cm^2/mm
// linear density over 800mm); reflected load inertia J=1.58e-4 kg*m^2;
// angular acceleration alpha=942 rad/s^2; acceleration torque T3=200 N*mm;
// Tk1(upward accel, governing max)=1100 N*mm, Tt1(upward uniform)=900,
// Tg1(upward decel)=700, Tk2(downward accel)=630, Tt2(downward
// uniform)=830, Tg2(downward decel)=1030 -- all reproduced by this module's
// own signed resolveDriveForce/resolvePhaseTorque to within ~1% once
// external_force represents THK's own f=20N guide resistance (see the
// module doc comment above for why no direction-dependent sign flip on
// external_force is needed).
//
// "Studying the Driving Motor" (printed): Tmax=Tk1=1100 N*mm; over seven
// phases (upward accel/uniform/decel 0.2/1.8/0.2s, downward
// accel/uniform/decel 0.2/1.8/0.2s, stationary 7.6s with a nonzero holding
// torque Ts=658 N*mm), Trms=743 N*mm.
//
// **This module's own executeModule path does NOT reproduce 743 N*mm.**
// The dwell phase always contributes 0 torque (README.md "Not in scope for
// 0.1.0": no servo-motor holding-torque formula is modeled), but THK's own
// stationary phase carries a real, nonzero 658 N*mm holding torque over
// 7.6 of the cycle's 12 total seconds -- the single largest-duration phase
// in the whole cycle. Feeding this module's own real geometry/mass inputs
// (below) through executeModule computes effective_torque of ~527 N*mm, a
// genuine ~29% UNDERSTATEMENT of THK's own 743 N*mm -- a real, disclosed,
// quantified deviation from an already-documented scope gap (compute.ts's
// own "dwell-holding-torque-not-modeled" assumption), not a rounding
// residual. See ./thk-reference-examples.test.ts's own dedicated
// kernel-level test (feeding THK's own seven printed phase torques,
// including the 658 N*mm holding torque, directly into resolveEffectiveTorque)
// for direct confirmation that the N-phase Trms FORMULA itself reproduces
// THK's own 743 N*mm essentially exactly (within 0.1%) once given the same
// inputs THK itself used -- the actual "structural fix" claim this whole
// unit exists to validate, isolated from the separate, already-disclosed
// scope gap above.
export const THK_VERTICAL_TOTAL_MASS_KG = 50;
export const THK_VERTICAL_SCREW_DIAMETER_M = 0.015;
// Derived: J_B(target)=3.12e-5 kg*m^2 = (1/8)*M*D^2 at D=0.015m -> M=1.109
// kg. Cross-check: a solid steel cylinder (7850 kg/m^3) 15mm dia x 800mm
// long has mass 7850*pi*0.0075^2*0.8 = 1.11 kg -- agreement within 0.7%.
export const THK_VERTICAL_SCREW_MASS_KG = 1.109;
export const THK_VERTICAL_LEAD_M = 0.01;
export const THK_VERTICAL_EXTERNAL_FORCE_N = 20; // THK's own "guide surface resistance f".
export const THK_VERTICAL_UPWARD_LOAD_TORQUE_NM = 0.9;
export const THK_VERTICAL_DOWNWARD_LOAD_TORQUE_MAGNITUDE_NM = 0.83;
export const THK_VERTICAL_MOMENTARY_TORQUE_NM = 1.1;
export const THK_VERTICAL_LOAD_INERTIA_KG_M2 = 1.58e-4;
export const THK_VERTICAL_MOTOR_ROTOR_INERTIA_KG_M2 = 5e-5;
export const THK_VERTICAL_EFFECTIVE_TORQUE_NO_HOLDING_NM = 0.5276; // this module's own, disclosed value -- NOT THK's printed 0.743.

export const THK_VERTICAL_REFERENCE_EXAMPLE: RawInput = {
  values: {
    orientation: {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "vertical",
    },
    incline_angle: makeQuantity(Math.PI / 2, "rad"),
    // Irrelevant at exactly pi/2 (cos(pi/2)=0 zeroes this term regardless
    // of value) -- THK's own printed mu=0.003 is not used by its own
    // formula either (see the module doc comment above).
    friction_coefficient: makeQuantity(0, "ratio"),
    total_moving_mass: makeQuantity(THK_VERTICAL_TOTAL_MASS_KG, "kg"),
    lead: makeQuantity(THK_VERTICAL_LEAD_M, "m"),
    preload: makeQuantity(0, "N"),
    internal_friction_coefficient: makeQuantity(0, "ratio"),
    mechanical_efficiency: makeQuantity(0.9, "ratio"),
    screw_diameter: makeQuantity(THK_VERTICAL_SCREW_DIAMETER_M, "m"),
    screw_mass: makeQuantity(THK_VERTICAL_SCREW_MASS_KG, "kg"),
    external_force: makeQuantity(THK_VERTICAL_EXTERNAL_FORCE_N, "N"),
    forward_move_distance: makeQuantity(0.6, "m"),
    forward_max_velocity: makeQuantity(0.3, "m/s"),
    forward_max_acceleration: makeQuantity(1.5, "m/s^2"),
    return_move_distance: makeQuantity(0.6, "m"),
    return_max_velocity: makeQuantity(0.3, "m/s"),
    return_max_acceleration: makeQuantity(1.5, "m/s^2"),
    // THK's own real stationary duration (7.6s of a 12s cycle) -- kept
    // realistic here (not zeroed) specifically so effective_torque's own
    // ~29% understatement is visible and measured through the real compute
    // path, not hidden by a shortened dwell.
    dwell_time: makeQuantity(7.6, "s"),
    motor_rotor_inertia: makeQuantity(
      THK_VERTICAL_MOTOR_ROTOR_INERTIA_KG_M2,
      "kg*m^2",
    ),
    effective_torque_safety_factor: makeQuantity(1, "ratio"),
    momentary_torque_safety_factor: makeQuantity(1, "ratio"),
    inertia_ratio_maximum: makeQuantity(10, "ratio"),
  },
};

/**
 * THK's own seven printed phases for the vertical example's own effective
 * (RMS) torque calculation -- magnitudes and durations exactly as printed,
 * including the stationary holding torque (658 N*mm) this module's own
 * executeModule path does not model. Feeding these directly into
 * `resolveEffectiveTorque` (kernel level, not through compute.ts) is the
 * direct test of the N-phase Trms formula itself, isolated from the
 * dwell-holding-torque scope gap -- see ./thk-reference-examples.test.ts.
 */
export const THK_VERTICAL_PRINTED_PHASES: ReadonlyArray<{
  readonly torqueNm: number;
  readonly durationS: number;
}> = [
  { torqueNm: 1.1, durationS: 0.2 }, // Tk1, upward accel
  { torqueNm: 0.9, durationS: 1.8 }, // Tt1, upward uniform
  { torqueNm: 0.7, durationS: 0.2 }, // Tg1, upward decel
  { torqueNm: 0.63, durationS: 0.2 }, // Tk2, downward accel
  { torqueNm: 0.83, durationS: 1.8 }, // Tt2, downward uniform
  { torqueNm: 1.03, durationS: 0.2 }, // Tg2, downward decel
  { torqueNm: 0.658, durationS: 7.6 }, // Ts, stationary holding -- not modeled by this module's own compute.ts.
];
export const THK_VERTICAL_PRINTED_EFFECTIVE_TORQUE_NM = 0.743;
