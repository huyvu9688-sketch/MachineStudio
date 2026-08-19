// AutomationDirect's own "Belt Drive - Example Calculations" worked
// example (us.automationdirect.sureservo_selection_appendix@
// 2nd-ed-rev-b-08-2011, pp. B-11-B-13), reformulated for 0.2.0's own
// motion_mode="velocity" inputs. Geometry/mass/friction/efficiency
// figures are identical to 0.1.0's own copy of this fixture; the single
// printed 4.0s move time with 1.0s/1.0s accel/decel is now split
// explicitly into acceleration_time=1.0s, deceleration_time=1.0s,
// constant_velocity_time=2.0s (4.0 - 1.0 - 1.0), dwell_time=0s -- the
// source's own printed move time is unchanged, just decomposed into
// 0.2.0's own four-phase shape.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const LB_TO_KG = 0.45359237;
const IN_TO_M = 0.0254;
const LBF_IN_S2_TO_KG_M2 = 4.4482216152605 * IN_TO_M;
const LBF_IN_TO_NM = LBF_IN_S2_TO_KG_M2;

const TABLE_AND_WORKPIECE_WEIGHT_LB = 90;
const FRICTION_COEFFICIENT = 0.05;
const MECHANICAL_EFFICIENCY = 0.8;
const PULLEY_DIAMETER_IN = 2.0;
const PULLEY_THICKNESS_IN = 0.75;
const ALUMINUM_DENSITY_LB_PER_IN3 = 0.098;
const GEAR_RATIO = 10;
const STROKE_IN = 50;
const MOVE_TIME_S = 4.0;
const ACCEL_TIME_S = 1.0;
const DECEL_TIME_S = 1.0;
const CONSTANT_VELOCITY_TIME_S = MOVE_TIME_S - ACCEL_TIME_S - DECEL_TIME_S;

const pulleyDiameterM = PULLEY_DIAMETER_IN * IN_TO_M;
const pulleyRadiusM = pulleyDiameterM / 2;
const pulleyVolumeM3 =
  (Math.PI / 4) * pulleyDiameterM ** 2 * (PULLEY_THICKNESS_IN * IN_TO_M);
const aluminumDensityKgPerM3 =
  ALUMINUM_DENSITY_LB_PER_IN3 * (LB_TO_KG / IN_TO_M ** 3);
const PULLEY_MASS_KG = aluminumDensityKgPerM3 * pulleyVolumeM3;

const TOTAL_MOVING_MASS_KG = TABLE_AND_WORKPIECE_WEIGHT_LB * LB_TO_KG;

const TARGET_VELOCITY_MPS =
  (STROKE_IN / (MOVE_TIME_S - ACCEL_TIME_S)) * IN_TO_M;

export const AUTOMATIONDIRECT_BELT_DRIVE_REFERENCE_EXAMPLE: RawInput = {
  values: {
    orientation: {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "horizontal",
    },
    incline_angle: makeQuantity(0, "rad"),
    friction_coefficient: makeQuantity(FRICTION_COEFFICIENT, "ratio"),
    total_moving_mass: makeQuantity(TOTAL_MOVING_MASS_KG, "kg"),
    pulley_pitch_diameter: makeQuantity(pulleyDiameterM, "m"),
    pulley_mass: makeQuantity(PULLEY_MASS_KG, "kg"),
    idler_pulley_mass: makeQuantity(PULLEY_MASS_KG, "kg"),
    belt_mass: makeQuantity(0, "kg"),
    gear_ratio: makeQuantity(GEAR_RATIO, "ratio"),
    mechanical_efficiency: makeQuantity(MECHANICAL_EFFICIENCY, "ratio"),
    external_force: makeQuantity(0, "N"),
    motion_mode: {
      v: 1,
      kind: "enum",
      enumId: "belt_pulley_motion_mode",
      value: "velocity",
    },
    target_velocity: makeQuantity(TARGET_VELOCITY_MPS, "m/s"),
    acceleration_time: makeQuantity(ACCEL_TIME_S, "s"),
    deceleration_time: makeQuantity(DECEL_TIME_S, "s"),
    constant_velocity_time: makeQuantity(CONSTANT_VELOCITY_TIME_S, "s"),
    dwell_time: makeQuantity(0, "s"),
    // Not printed by the source as a standalone figure -- see 0.1.0's own
    // automationdirect-reference-example.test.ts header comment for why
    // this value is derived from the printed inertia_ratio=9.6 rather
    // than claimed as a source figure. Carried over unchanged.
    motor_rotor_inertia: makeQuantity(3.4372e-5, "kg*m^2"),
    required_torque_safety_factor: makeQuantity(1, "ratio"),
    inertia_ratio_maximum: makeQuantity(1e6, "ratio"),
  },
};

export const PRINTED_PULLEY_INERTIA_LB_IN_S2 = 0.000598;
export const PRINTED_PULLEY_INERTIA_KGM2 =
  PRINTED_PULLEY_INERTIA_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

export const PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_LB_IN_S2 = 0.29145;
export const PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_KGM2 =
  PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

export const PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_LB_IN_S2 = 0.00292;
export const PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_KGM2 =
  PRINTED_REFLECTED_INERTIA_WITH_EFFICIENCY_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

export {
  PULLEY_MASS_KG,
  TOTAL_MOVING_MASS_KG,
  TARGET_VELOCITY_MPS,
  pulleyDiameterM,
  pulleyRadiusM,
  LBF_IN_TO_NM,
};
