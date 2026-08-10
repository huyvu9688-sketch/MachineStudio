// Omron Corporation's own complete worked numerical example ("Servo Motor
// Selection Software" sample calculation, jp.omron.servo_motor_selection_
// guide@csm-tg-e-3-1, printed pages 12-13), reproduced through this
// module's ACTUAL compute path (executeModule), not just the kernel
// formula level ./math.test.ts already covers.
//
// Scenario: a direct-connected ball-screw axis (no gearbox, G=1), load
// mass M=5 kg, ball-screw pitch P=10 mm, ball-screw diameter D=20 mm,
// ball-screw mass MB=3 kg, friction coefficient mu=0.1, no reducer
// (G=1, eta=1). Motion: one speed change, velocity V=300 mm/s, stroke
// L=360 mm, stroke travel time tS=1.4 s, acceleration/deceleration time
// tA=0.2 s, single cycle = accel(0.2s) + constant(1.0s) + decel(0.2s) +
// dwell(0.2s) = 1.6 s. Motor temporarily selected: OMNUC U-series
// R88M-U20030 (JM=1.23e-5 kg*m^2, rated torque TM=0.637 N*m, maximum
// momentary torque 1.91 N*m, rated speed 3000 rpm).
//
// Omron's own printed intermediate figures (hand-verified in
// context/modules/drive-train/stage-1-spec.md and again here): ball-screw
// inertia JB=1.5e-4 kg*m^2, load inertia (reflected, G=1) JL=1.63e-4
// kg*m^2, friction/load torque TW=TL=7.8e-3 N*m, operating speed
// N=1800 rpm, acceleration torque TA=0.165 N*m, maximum momentary torque
// T1=0.173 N*m, effective (RMS) torque Trms=0.0828 N*m. All five of
// Omron's own "Result of Examination" checks pass (load inertia, effective
// torque, maximum momentary torque, maximum rotation speed, encoder
// resolution -- the last of these is out of scope for this module).
// Omron's own text explicitly omits the regenerative-energy calculation
// ("Note. This example omits calculations for the regenerative energy"),
// so this fixture supplies no drive.regen_absorption_capacity and expects
// a not_applicable regen check, not a pass/fail assertion tied to a
// published number that does not exist.
//
// rms_acceleration is not printed by Omron directly -- it is derived here
// from Omron's own printed duty-cycle segments (accel 0.2 s @ 1.5 m/s^2,
// constant 1.0 s @ 0, decel 0.2 s @ 1.5 m/s^2, dwell 0.2 s @ 0):
// a_rms = sqrt((1.5^2*0.2 + 1.5^2*0.2) / 1.6) = 0.75 m/s^2 exactly. Feeding
// this through ./math.ts's own resolveEffectiveTorque reproduces Omron's
// own printed Trms = 0.0828 N*m within 0.0003 N*m (~0.25%) -- the residual
// is consistent with Omron's own 3-significant-figure rounding of JB, JW,
// and TA before it computes T1/T2/T3 discretely, not slack introduced to
// pass this test (context/modules/drive-train/stage-2-contract.md
// "Decisions" item 4 note: this is the first real numeric confirmation of
// this project's own closed-cycle RMS-acceleration derivation).
//
// The module structurally requires a peak case; Omron's own example gives
// only one operating condition, so peak duplicates normal -- not itself
// evidence, just satisfying the required port shape (the same treatment
// lib/modules/support-bearing/0.1.0/nsk-reference-examples.ts already
// gives its own single-condition NSK examples).

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;

export const OMRON_LOAD_INERTIA_KG_M2 = 1.63e-4;
export const OMRON_LOAD_TORQUE_NM = 7.8e-3;
export const OMRON_MOTOR_ROTOR_INERTIA_KG_M2 = 1.23e-5;
export const OMRON_MOTOR_RATED_TORQUE_NM = 0.637;
export const OMRON_MOTOR_PEAK_TORQUE_NM = 1.91;
export const OMRON_MOTOR_RATED_SPEED_RPM = 3000;
export const OMRON_ACCELERATION_TORQUE_NM = 0.165;
export const OMRON_MOMENTARY_TORQUE_NM = 0.173;
export const OMRON_EFFECTIVE_TORQUE_NM = 0.0828;
export const OMRON_OPERATING_SPEED_RPM = 1800;

function sharedInput(): RawInput["values"] {
  return {
    lead: makeQuantity(0.01, "m"),
    gear_ratio: makeQuantity(1, "ratio"),
    motor_rated_torque: makeQuantity(OMRON_MOTOR_RATED_TORQUE_NM, "N*m"),
    motor_peak_torque: makeQuantity(OMRON_MOTOR_PEAK_TORQUE_NM, "N*m"),
    motor_rated_speed: makeQuantity(
      OMRON_MOTOR_RATED_SPEED_RPM * RPM_TO_RAD_PER_S,
      "rad/s",
    ),
    motor_rotor_inertia: makeQuantity(
      OMRON_MOTOR_ROTOR_INERTIA_KG_M2,
      "kg*m^2",
    ),
    reflected_load_inertia: makeQuantity(OMRON_LOAD_INERTIA_KG_M2, "kg*m^2"),
    // Omron's own worked checks use a flat 0.8 margin for both the
    // effective-torque and maximum-momentary-torque checks.
    rms_torque_margin: makeQuantity(0.8, "ratio"),
    peak_torque_margin: makeQuantity(0.8, "ratio"),
    // Omron's own "Motor Rotor Inertia x Applicable Inertia Ratio" check
    // uses 30 for this specific motor series (a per-series catalog value,
    // not a universal constant -- stage-1-spec.md item 5).
    inertia_ratio_maximum: makeQuantity(30, "ratio"),
    peak_acceleration: makeQuantity(1.5, "m/s^2"),
    peak_deceleration: makeQuantity(1.5, "m/s^2"),
    rms_acceleration: makeQuantity(0.75, "m/s^2"),
    normal_drive_torque: makeQuantity(OMRON_LOAD_TORQUE_NM, "N*m"),
    normal_linear_velocity: makeQuantity(0.3, "m/s"),
    peak_drive_torque: makeQuantity(OMRON_LOAD_TORQUE_NM, "N*m"),
    peak_linear_velocity: makeQuantity(0.3, "m/s"),
  };
}

export const OMRON_REFERENCE_EXAMPLE: RawInput = { values: sharedInput() };
