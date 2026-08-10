// THK Co., Ltd.'s own two published worked examples ("Examples of Selecting
// a Ball Screw," THK Ball Screw General Catalog) reproduced through this
// module's ACTUAL compute path (executeModule), not just the kernel formula
// level. Source: jp.thk.example_ball_screw_selection@technico-mirror-
// 2026-08-10 (lib/standards/engineering-sources.ts) -- the same document
// axis-load-cases 0.1.0 and ball-screw 0.1.0 already cite for these two
// examples' own mechanical (screw/life) sections; this module is the first
// to read their own "Studying the Driving Motor" sections, which those two
// modules' own scope never needed.
//
// Both examples explicitly name "AC servo motor" as the driving motor
// throughout (unlike the induction/stepper-motor examples this module's own
// README.md "Stage 4" already ruled out for conflating a different torque-
// margin convention), and both decompose required torque into the identical
// two-term shape this module's own math.ts kernel uses: a friction/load-only
// term (screw.drive_torque, no acceleration component) plus a separate
// inertial acceleration-torque term, summed for the maximum momentary
// torque. Neither example names a specific catalog motor SKU (unlike
// Omron's own ./omron-reference-example.ts) -- each stops at stating the
// REQUIRED minimum rated/peak torque and inertia a motor must have. This
// fixture supplies a plausible catalog motor with headroom above THK's own
// stated minimum (documented per example below), not a source-printed
// figure -- disclosed here rather than presented as THK's own selection.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;

// --- Example 1: High-speed Transfer Equipment (Horizontal Use) -------------
//
// Selection conditions (printed): table mass m1=60 kg, work mass m2=20 kg,
// stroke S=1000 mm, max speed Vmax=1 m/s, accel/decel time t1=t3=0.15 s,
// no gearbox (direct coupling, A=1), motor rated speed 3000 min^-1, motor
// rotor inertia Jm=1e-3 kg*m^2. Selected screw: WTF2040-2 (lead Ph=40mm),
// the same model axis-load-cases'/ball-screw's own fixtures already cite.
//
// "Studying the Rotational Torque" (printed): friction torque T1=120 N*mm;
// reflected load inertia J=3.39e-3 kg*m^2 (screw + load, before adding
// motor rotor inertia); angular acceleration alpha=1050 rad/s^2 (a rounded
// 3-sig-fig figure -- the exact value from Vmax/lead*2*pi/t1 is 1047.2
// rad/s^2, used here rather than THK's own rounded figure); acceleration
// torque T2=4.61 N*m; maximum torque during acceleration Tk=4730 N*mm;
// during deceleration Tg=-4490 N*mm; during uniform motion Tt=120 N*mm;
// stationary Ts=0.
//
// "Studying the Driving Motor" (printed): "the instantaneous maximum torque
// of the AC servomotor needs to be at least 4,730 N-mm" (Tmax); "the rated
// torque of the motor must be 1305 N*mm or greater" (Trms, via
// Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)) over the four printed phases);
// "the inertial moment of the AC servomotor must be 3.39e-4 kg-m^2 or
// greater" (J/10, a "load inertia <= 10x motor inertia" rule matching this
// module's own inertia-ratio check).
export const THK_HORIZONTAL_LOAD_INERTIA_KG_M2 = 3.39e-3;
export const THK_HORIZONTAL_MOTOR_ROTOR_INERTIA_KG_M2 = 1e-3;
export const THK_HORIZONTAL_LOAD_TORQUE_NM = 0.12;
export const THK_HORIZONTAL_MOMENTARY_TORQUE_NM = 4.73;
export const THK_HORIZONTAL_EFFECTIVE_TORQUE_NM = 1.305;
export const THK_HORIZONTAL_MOTOR_RATED_SPEED_RPM = 3000;

function thkHorizontalInput(): RawInput["values"] {
  // Accel/decel magnitude: Vmax/t1 = 1/0.15 m/s^2 (exact, not THK's own
  // rounded 6.67). RMS acceleration across the four printed phases
  // (accel 0.15s, uniform 0.85s, decel 0.15s, stationary 2.6s):
  // a_rms = sqrt((a^2*0.15 + 0 + a^2*0.15 + 0) / 3.8), the same "derive
  // a_rms from printed duty-cycle segments" treatment
  // ./omron-reference-example.ts already uses.
  const accelMps2 = 1 / 0.15;
  const rmsAccelMps2 = Math.sqrt(
    (accelMps2 ** 2 * 0.15 + accelMps2 ** 2 * 0.15) /
      (0.15 + 0.85 + 0.15 + 2.6),
  );

  return {
    lead: makeQuantity(0.04, "m"),
    gear_ratio: makeQuantity(1, "ratio"),
    // No catalog motor is named by THK; a plausible motor with headroom
    // above THK's own stated minimum (rated 1.305 N*m, peak 4.73 N*m) is
    // supplied here, not a source-printed figure -- see this file's own
    // module doc comment.
    motor_rated_torque: makeQuantity(1.4, "N*m"),
    motor_peak_torque: makeQuantity(5, "N*m"),
    motor_rated_speed: makeQuantity(
      THK_HORIZONTAL_MOTOR_RATED_SPEED_RPM * RPM_TO_RAD_PER_S,
      "rad/s",
    ),
    motor_rotor_inertia: makeQuantity(
      THK_HORIZONTAL_MOTOR_ROTOR_INERTIA_KG_M2,
      "kg*m^2",
    ),
    reflected_load_inertia: makeQuantity(
      THK_HORIZONTAL_LOAD_INERTIA_KG_M2,
      "kg*m^2",
    ),
    // THK's own text states each requirement as a plain "must be at least"
    // minimum -- no derating factor is given, so both margins are 1.0, a
    // real, sourced difference from Omron's own flat 0.8 margin (recorded
    // in validation.ts).
    rms_torque_margin: makeQuantity(1, "ratio"),
    peak_torque_margin: makeQuantity(1, "ratio"),
    // THK's own "at least one tenth" rule: J_motor >= J_load/10, i.e.
    // J_load/J_motor <= 10.
    inertia_ratio_maximum: makeQuantity(10, "ratio"),
    peak_acceleration: makeQuantity(accelMps2, "m/s^2"),
    peak_deceleration: makeQuantity(accelMps2, "m/s^2"),
    rms_acceleration: makeQuantity(rmsAccelMps2, "m/s^2"),
    normal_drive_torque: makeQuantity(THK_HORIZONTAL_LOAD_TORQUE_NM, "N*m"),
    normal_linear_velocity: makeQuantity(1, "m/s"),
    peak_drive_torque: makeQuantity(THK_HORIZONTAL_LOAD_TORQUE_NM, "N*m"),
    peak_linear_velocity: makeQuantity(1, "m/s"),
  };
}

export const THK_HORIZONTAL_REFERENCE_EXAMPLE: RawInput = {
  values: thkHorizontalInput(),
};

// --- Example 2: Vertical Conveyance System (partial -- see below) ----------
//
// Selection conditions (printed): table mass m1=40 kg, work mass m2=10 kg,
// stroke S=600 mm, max speed Vmax=0.3 m/s, accel/decel time t1=t3=0.2 s,
// no gearbox, motor rated speed 3000 min^-1, motor rotor inertia
// Jm=5e-5 kg*m^2. Selected screw: BLK1510-5.6 (lead Ph=10mm).
//
// "Studying the Rotational Torque" (printed): friction torque during upward
// uniform motion T1=900 N*mm, during downward uniform motion T2=830 N*mm
// (these differ -- gravity adds to the upward guide-resistance term and
// subtracts from the downward one, a real asymmetry a horizontal axis does
// not have); reflected load inertia J=1.58e-4 kg*m^2; angular acceleration
// alpha=942 rad/s^2; acceleration torque T3=200 N*mm; Tk1 (upward
// acceleration, the governing maximum) = 1100 N*mm; Tk2 (downward
// acceleration, gravity-assisted) = 630 N*mm; when stationary (m2=0,
// i.e. work unloaded at rest) Ts=658 N*mm.
//
// "Studying the Driving Motor" (printed): "the maximum peak torque of the
// AC servomotor needs to be at least 1100 N-mm" (Tmax=Tk1); "the rated
// torque of the motor must be 743 N*mm or greater" (Trms, via the same
// per-phase formula, now over seven phases: upward accel/uniform/decel,
// downward accel/uniform/decel, stationary); "the inertial moment of the
// AC servomotor must be 1.58e-5 kg-m^2 or greater" (J/10).
//
// **This fixture reproduces Tk1 (peak/momentary torque) and the inertia-
// ratio-relevant J, but NOT Trms.** THK's own seven-phase cycle has two
// real properties this module's own closed-cycle assumption
// (context/modules/drive-train/stage-2-contract.md "Decisions" item 4:
// "total system inertia and the per-case load torque both stay constant
// across a cycle") does not cover: the load torque differs between the
// upward (900 N*mm) and downward (830 N*mm) halves of the cycle instead of
// staying constant, and the stationary-phase torque is a nonzero holding
// value (658 N*mm, not zero) rather than either zero or the same constant
// load torque. Feeding this module's own actual required inputs (peak
// case, driveTorque=T1=0.9 N*m, the full-cycle rms_acceleration computed
// the same way as the horizontal example) through the real closed-form
// kernel gives an effective torque of ~0.901 N*m -- about 21% above THK's
// own printed 0.743 N*m, a genuine, quantified deviation from the closed-
// cycle assumption's own precondition, not a rounding residual (compare the
// horizontal example's own <0.1% residual, or the < 2% momentary-torque
// residual below, both consistent with ordinary 3-significant-figure
// rounding). Recorded as a real, sourced limitation in validation.ts
// "deviations," not silently worked around. This module also cannot
// reproduce THK's own Tk2=630 N*mm (downward, gravity-assisted) at all:
// math.ts's resolveAccelerationTorque always adds the acceleration torque
// to the load torque (a deliberate, documented conservative choice -- see
// that function's own doc comment), never subtracts it for a gravity-
// assisted direction, so it cannot express THK's own lower gravity-assisted
// figure -- consistent with that conservative choice, not a defect.
export const THK_VERTICAL_LOAD_INERTIA_KG_M2 = 1.58e-4;
export const THK_VERTICAL_MOTOR_ROTOR_INERTIA_KG_M2 = 5e-5;
export const THK_VERTICAL_UPWARD_LOAD_TORQUE_NM = 0.9;
export const THK_VERTICAL_MOMENTARY_TORQUE_NM = 1.1;
export const THK_VERTICAL_MOTOR_RATED_SPEED_RPM = 3000;

function thkVerticalInput(): RawInput["values"] {
  const accelMps2 = 0.3 / 0.2;
  // Full seven-phase cycle's own rms_acceleration (accel/decel occur twice,
  // once per direction, each 0.2s; uniform and stationary phases contribute
  // zero acceleration) -- the value a real workflow would actually supply
  // from motion-profile, not one rigged to make the effective-torque check
  // agree with THK's own figure (see this file's own module doc comment for
  // why it does not).
  const rmsAccelMps2 = Math.sqrt(
    (accelMps2 ** 2 * 0.2 * 2) / (0.2 + 1.8 + 0.2 + 0.2 + 1.8 + 0.2 + 7.6),
  );

  return {
    lead: makeQuantity(0.01, "m"),
    gear_ratio: makeQuantity(1, "ratio"),
    // No catalog motor is named by THK; a plausible motor with headroom
    // above THK's own stated minimum (peak 1.1 N*m) is supplied here, not a
    // source-printed figure. motor_rated_torque is set generously above
    // this module's own computed effective torque (~0.901 N*m, not THK's
    // 0.743 N*m -- see this file's own module doc comment) so the RMS-
    // torque check still passes; its value is not evidence of anything.
    motor_rated_torque: makeQuantity(1.2, "N*m"),
    motor_peak_torque: makeQuantity(1.3, "N*m"),
    motor_rated_speed: makeQuantity(
      THK_VERTICAL_MOTOR_RATED_SPEED_RPM * RPM_TO_RAD_PER_S,
      "rad/s",
    ),
    motor_rotor_inertia: makeQuantity(
      THK_VERTICAL_MOTOR_ROTOR_INERTIA_KG_M2,
      "kg*m^2",
    ),
    reflected_load_inertia: makeQuantity(
      THK_VERTICAL_LOAD_INERTIA_KG_M2,
      "kg*m^2",
    ),
    rms_torque_margin: makeQuantity(1, "ratio"),
    peak_torque_margin: makeQuantity(1, "ratio"),
    inertia_ratio_maximum: makeQuantity(10, "ratio"),
    peak_acceleration: makeQuantity(accelMps2, "m/s^2"),
    peak_deceleration: makeQuantity(accelMps2, "m/s^2"),
    rms_acceleration: makeQuantity(rmsAccelMps2, "m/s^2"),
    // Single scenario (the governing upward/peak direction) duplicated
    // across both cases -- the same treatment
    // ./omron-reference-example.ts's own module doc comment records for a
    // source with only one operating condition.
    normal_drive_torque: makeQuantity(
      THK_VERTICAL_UPWARD_LOAD_TORQUE_NM,
      "N*m",
    ),
    normal_linear_velocity: makeQuantity(0.3, "m/s"),
    peak_drive_torque: makeQuantity(THK_VERTICAL_UPWARD_LOAD_TORQUE_NM, "N*m"),
    peak_linear_velocity: makeQuantity(0.3, "m/s"),
  };
}

export const THK_VERTICAL_REFERENCE_EXAMPLE: RawInput = {
  values: thkVerticalInput(),
};
