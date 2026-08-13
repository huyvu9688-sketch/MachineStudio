// Oriental Motor Co., Ltd.'s own two conveyor worked examples (General
// Catalog Technical Reference, jp.oriental_motor.
// general_catalog_motor_fan_sizing@f-tecref-2003-2004, pp. F-8-F-9),
// reproduced as real module inputs so ./oriental-motor-reference-
// examples.test.ts can run them through the real executeModule compute
// path -- the same pattern ball-screw-motor-sizing/0.1.0/
// thk-reference-examples.ts already establishes.
//
// Both worked examples in this source document are geared (i=50 on p.
// F-8, i=15 on p. F-9); this module's own 0.1.0 scope fixes i=1
// (direct-drive, stage-1-spec.md "Validity Envelope"), so only the
// figures upstream of the gearhead -- friction force, load torque,
// on-shaft inertia, and roller-shaft operating speed -- are reproducible
// here. Neither example computes an acceleration-torque term at all (see
// validation.ts "deviations"), so acceleration_time and
// motor_rotor_inertia below are this module's own unsourced placeholder
// values, chosen only to exercise the full compute path -- not claimed as
// reproducing any printed figure.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const LB_TO_KG = 0.45359237;
const OZ_TO_KG = LB_TO_KG / 16;
const IN_TO_M = 0.0254;

/**
 * p. F-8, "Belt and Pully": m1=30 lb (belt+work, modeled here entirely as
 * carried_load_mass -- the source never splits belt mass from work mass,
 * and both this module's own load-torque and inertia formulas are linear
 * in the combined mass, so the split is immaterial), mu=0.3, D=4 in (both
 * rollers), m2=35.27 oz (both rollers, identical), eta=0.9, V=7 in/s.
 */
export const ORIENTAL_MOTOR_F8_BELT_AND_PULLEY_REFERENCE_EXAMPLE: RawInput = {
  values: {
    drive_roller_diameter: makeQuantity(4 * IN_TO_M, "m"),
    drive_roller_mass: makeQuantity(35.27 * OZ_TO_KG, "kg"),
    idler_roller_diameter: makeQuantity(4 * IN_TO_M, "m"),
    idler_roller_mass: makeQuantity(35.27 * OZ_TO_KG, "kg"),
    belt_mass: makeQuantity(0, "kg"),
    carried_load_mass: makeQuantity(30 * LB_TO_KG, "kg"),
    belt_friction_coefficient: makeQuantity(0.3, "ratio"),
    mechanical_efficiency: makeQuantity(0.9, "ratio"),
    target_belt_speed: makeQuantity(7 * IN_TO_M, "m/s"),
    // Not stated by the source (see this file's own header comment).
    acceleration_time: makeQuantity(2, "s"),
    motor_rotor_inertia: makeQuantity(1e-5, "kg*m^2"),
    required_torque_safety_factor: makeQuantity(2, "ratio"),
    inertia_ratio_maximum: makeQuantity(1000, "ratio"),
  },
};

/** Load torque: F=mu*m1=9 lb=144 oz; TL=F*D/(2*eta)=320 oz-in. */
export const ORIENTAL_MOTOR_F8_LOAD_TORQUE_NM = 2.259696580552334;
/** On-shaft inertia (both rollers + belt+work), excluding the motor's own rotor: J1(both)+J2=141+1920=2061 oz-in^2. */
export const ORIENTAL_MOTOR_F8_ON_SHAFT_INERTIA_KGM2 = 0.03769710855561598;
/** Roller/motor shaft operating speed: NG=V*60/(pi*D)=33.4 r/min. */
export const ORIENTAL_MOTOR_F8_OPERATING_SPEED_RPM = 33.4;

/**
 * p. F-9, "Conveyor": D=4 in, m1=2.2 lb (per roller, both rollers
 * identical), m2=33 lb (belt+work, modeled here entirely as
 * carried_load_mass), mu=0.3, eta=0.9.
 *
 * The source's own printed belt+work inertia figure (Jm2=132 oz-in^2) is
 * a disclosed arithmetic inconsistency internal to the source itself (see
 * validation.ts "deviations") -- this scenario is used only to confirm
 * load_torque, not any inertia output.
 */
export const ORIENTAL_MOTOR_F9_CONVEYOR_REFERENCE_EXAMPLE: RawInput = {
  values: {
    drive_roller_diameter: makeQuantity(4 * IN_TO_M, "m"),
    drive_roller_mass: makeQuantity(2.2 * LB_TO_KG, "kg"),
    idler_roller_diameter: makeQuantity(4 * IN_TO_M, "m"),
    idler_roller_mass: makeQuantity(2.2 * LB_TO_KG, "kg"),
    belt_mass: makeQuantity(0, "kg"),
    carried_load_mass: makeQuantity(33 * LB_TO_KG, "kg"),
    belt_friction_coefficient: makeQuantity(0.3, "ratio"),
    mechanical_efficiency: makeQuantity(0.9, "ratio"),
    target_belt_speed: makeQuantity(0.6 * IN_TO_M, "m/s"),
    // Not stated by the source (see this file's own header comment).
    acceleration_time: makeQuantity(2, "s"),
    motor_rotor_inertia: makeQuantity(1e-5, "kg*m^2"),
    required_torque_safety_factor: makeQuantity(2, "ratio"),
    inertia_ratio_maximum: makeQuantity(1000, "ratio"),
  },
};

/** Load torque: F=mu*m2=9.9 lb; TL=F*D/(2*eta)=22 lb-in. */
export const ORIENTAL_MOTOR_F9_LOAD_TORQUE_NM = 2.485666238607567;
/** Single-roller inertia (Jm1): (1/8)*m1*D^2 = 70.4 oz-in^2 -- confirmed at the kernel level in math.test.ts; NOT the source's own printed JG, which is internally inconsistent (see validation.ts "deviations"). */
export const ORIENTAL_MOTOR_F9_SINGLE_ROLLER_INERTIA_KGM2 = 0.0012876144750884801;
