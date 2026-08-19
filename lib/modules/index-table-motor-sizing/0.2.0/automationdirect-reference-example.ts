// AutomationDirect's own "Index Table - Example Calculations" worked
// example (us.automationdirect.sureservo_selection_appendix@
// 2nd-ed-rev-b-08-2011, pp. B-14-B-16), reproduced here as a real module
// input so ./automationdirect-reference-example.test.ts can run it through
// the real executeModule compute path.
//
// Inputs, as printed: index table diameter 12 in, thickness 3.25 in,
// steel (rho=0.28 lb/in^3), gear reducer 6:1, index angle 45 deg, index
// time 0.5 s, acceleration (=deceleration) period 25% of index time
// (0.125 s -- the source's own stated modeling choice, computed here
// exactly rather than copying its own further-rounded 0.13 s printed
// intermediate -- see this file's own header note in math.ts and
// validation.ts "deviations"). Selected motor SVM-220,
// J_motor=0.014 lb-in-sec^2. Table mass is DERIVED below from the printed
// geometry/density, in SI, rather than copied from the source's own
// intermediate lb-in-sec^2 figure -- this module's own parameter contract
// takes table_mass directly, not diameter/thickness/density.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const LB_TO_KG = 0.45359237;
const IN_TO_M = 0.0254;
// 1 lbf-in-s^2 (a moment of inertia in the English Gravitational System,
// weight-based -- AutomationDirect's own Jtable=(pi*L*rho*r^4)/(2g)
// formula explicitly divides by g) in kg*m^2: 1 lbf = 4.4482216152605 N;
// 1 in = 0.0254 m. The same conversion factor
// belt-pulley-drive-motor-sizing@0.1.0's own reference-example fixture
// already established and validated for this exact source's own unit
// convention.
const LBF_IN_S2_TO_KG_M2 = 4.4482216152605 * IN_TO_M;
const LBF_IN_TO_NM = LBF_IN_S2_TO_KG_M2;

const TABLE_DIAMETER_IN = 12.0;
const TABLE_THICKNESS_IN = 3.25;
const STEEL_DENSITY_LB_PER_IN3 = 0.28;
const GEAR_RATIO = 6;
const INDEX_ANGLE_DEG = 45;
const INDEX_TIME_S = 0.5;
// The source's own stated modeling choice ("accel time is 25% of the
// positioning period is appropriate"), computed exactly.
const ACCELERATION_TIME_S = INDEX_TIME_S * 0.25;
const MOTOR_ROTOR_INERTIA_LB_IN_S2 = 0.014;

const tableDiameterM = TABLE_DIAMETER_IN * IN_TO_M;
const tableVolumeM3 =
  (Math.PI / 4) * tableDiameterM ** 2 * (TABLE_THICKNESS_IN * IN_TO_M);
const steelDensityKgPerM3 =
  STEEL_DENSITY_LB_PER_IN3 * (LB_TO_KG / IN_TO_M ** 3);
/** Table mass, derived from its own printed geometry and density. */
const TABLE_MASS_KG = steelDensityKgPerM3 * tableVolumeM3;
const MOTOR_ROTOR_INERTIA_KGM2 =
  MOTOR_ROTOR_INERTIA_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

export const AUTOMATIONDIRECT_INDEX_TABLE_REFERENCE_EXAMPLE: RawInput = {
  values: {
    table_mass: makeQuantity(TABLE_MASS_KG, "kg"),
    table_diameter: makeQuantity(tableDiameterM, "m"),
    attached_load_inertia: makeQuantity(0, "kg*m^2"),
    gear_ratio: makeQuantity(GEAR_RATIO, "ratio"),
    index_angle: makeQuantity((INDEX_ANGLE_DEG * Math.PI) / 180, "rad"),
    index_time: makeQuantity(INDEX_TIME_S, "s"),
    acceleration_time: makeQuantity(ACCELERATION_TIME_S, "s"),
    load_torque: makeQuantity(0, "N*m"),
    motor_rotor_inertia: makeQuantity(MOTOR_ROTOR_INERTIA_KGM2, "kg*m^2"),
    required_torque_safety_factor: makeQuantity(1, "ratio"),
    inertia_ratio_maximum: makeQuantity(1e6, "ratio"),
  },
};

/** `Jtable = (pi*L*rho*r^4)/(2g)` -- printed 4.80 lb-in-sec^2. */
export const PRINTED_TABLE_INERTIA_LB_IN_S2 = 4.8;
export const PRINTED_TABLE_INERTIA_KGM2 =
  PRINTED_TABLE_INERTIA_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

/** `Jtable_to_motor = Jtable/i^2` -- printed 0.133 lb-in-sec^2. */
export const PRINTED_REFLECTED_INERTIA_LB_IN_S2 = 0.133;
export const PRINTED_REFLECTED_INERTIA_KGM2 =
  PRINTED_REFLECTED_INERTIA_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

/** Motor-shaft operating speed -- printed 121 rpm. */
export const PRINTED_OPERATING_SPEED_RPM = 121;

/** Final Taccel with the selected motor -- printed 13.68 lb-in, using the source's own rounded 0.1 (not 2*pi/60) constant. */
export const PRINTED_ACCELERATION_TORQUE_LB_IN = 13.68;
export const PRINTED_ACCELERATION_TORQUE_NM =
  PRINTED_ACCELERATION_TORQUE_LB_IN * LBF_IN_TO_NM;

/** Printed inertia ratio: Jtable_to_motor / Jmotor. */
export const PRINTED_INERTIA_RATIO = 9.5;

export {
  TABLE_MASS_KG,
  tableDiameterM,
  MOTOR_ROTOR_INERTIA_KGM2,
  LBF_IN_TO_NM,
};
