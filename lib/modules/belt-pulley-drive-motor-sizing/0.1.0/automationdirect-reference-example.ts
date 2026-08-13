// AutomationDirect's own "Belt Drive - Example Calculations" worked
// example (us.automationdirect.sureservo_selection_appendix@
// 2nd-ed-rev-b-08-2011, pp. B-11-B-13) -- the first fully worked, publicly
// citable belt-drive motor-sizing example located for this project
// (stage-1-spec.md "Reference Example"), reproduced here as a real module
// input so ./automationdirect-reference-example.test.ts can run it through
// the real executeModule compute path.
//
// Inputs, as printed: table+workpiece W=90 lb, F_ext=0, mu=0.05, theta=0
// (horizontal), belt/pulley efficiency e=0.8, pulley diameter 2.0 in
// (r=1 in), pulley thickness 0.75 in, aluminum (rho=0.098 lb/in^3), gear
// reducer 10:1, stroke 50 in, move time 4.0 s, accel/decel 1.0 s each.
// Pulley mass and target velocity are DERIVED below from these printed
// geometry/motion figures, in SI, rather than copied from the source's own
// intermediate lb-in-s^2/rpm figures -- this module's own parameter
// contract takes pulley_mass and target_velocity directly, not diameter/
// density or stroke/time.

import { makeQuantity } from "@/lib/engine";
import type { RawInput } from "./test-helpers";

const LB_TO_KG = 0.45359237;
const IN_TO_M = 0.0254;
// 1 lbf-in-s^2 (a moment of inertia in the English Gravitational System) in
// kg*m^2: 1 lbf = 4.4482216152605 N; 1 in = 0.0254 m.
const LBF_IN_S2_TO_KG_M2 = 4.4482216152605 * IN_TO_M;
// 1 lbf-in (a torque) in N*m: same conversion factor, different unit.
const LBF_IN_TO_NM = LBF_IN_S2_TO_KG_M2;

const TABLE_AND_WORKPIECE_WEIGHT_LB = 90;
const FRICTION_COEFFICIENT = 0.05;
// AutomationDirect's own belt/pulley efficiency. Required by this module's
// own mechanical_efficiency port, but -- per stage-1-spec.md "A real
// disagreement between sources" -- this module applies it to load_torque
// (Oriental Motor's convention), not to inertia (AutomationDirect's own
// convention). Supplying it lets the module run; it does not make
// load_torque/momentary_torque/required_torque reproduce the source's own
// printed figures -- see validation.ts "deviations".
const MECHANICAL_EFFICIENCY = 0.8;
const PULLEY_DIAMETER_IN = 2.0;
const PULLEY_THICKNESS_IN = 0.75;
const ALUMINUM_DENSITY_LB_PER_IN3 = 0.098;
const GEAR_RATIO = 10;
const STROKE_IN = 50;
const MOVE_TIME_S = 4.0;
const ACCEL_TIME_S = 1.0;

const pulleyDiameterM = PULLEY_DIAMETER_IN * IN_TO_M;
const pulleyRadiusM = pulleyDiameterM / 2;
const pulleyVolumeM3 =
  (Math.PI / 4) * pulleyDiameterM ** 2 * (PULLEY_THICKNESS_IN * IN_TO_M);
const aluminumDensityKgPerM3 =
  ALUMINUM_DENSITY_LB_PER_IN3 * (LB_TO_KG / IN_TO_M ** 3);
/** Each pulley's own mass, derived from its printed geometry and density -- both pulleys are identical in this example. */
const PULLEY_MASS_KG = aluminumDensityKgPerM3 * pulleyVolumeM3;

const TOTAL_MOVING_MASS_KG = TABLE_AND_WORKPIECE_WEIGHT_LB * LB_TO_KG;

// Trapezoidal move profile, accel time = decel time: stroke =
// V*(ta/2+tc+td/2) = V*(MOVE_TIME_S - ACCEL_TIME_S) when ta=td.
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
    target_velocity: makeQuantity(TARGET_VELOCITY_MPS, "m/s"),
    acceleration_time: makeQuantity(ACCEL_TIME_S, "s"),
    // Not printed by the source as a standalone figure -- see
    // ./automationdirect-reference-example.test.ts's own header comment
    // for why this value is derived from the printed inertia_ratio=9.6
    // rather than claimed as a source figure.
    motor_rotor_inertia: makeQuantity(3.4372e-5, "kg*m^2"),
    required_torque_safety_factor: makeQuantity(1, "ratio"),
    inertia_ratio_maximum: makeQuantity(1e6, "ratio"),
  },
};

/** `J_pulleys = (1/8)*(M_drive+M_idler)*D^2` -- printed 0.0006 lb-in-s^2, stage-1-spec.md's own recomputed 0.000598. Efficiency-independent. */
export const PRINTED_PULLEY_INERTIA_LB_IN_S2 = 0.000598;
export const PRINTED_PULLEY_INERTIA_KGM2 =
  PRINTED_PULLEY_INERTIA_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

/** `J_W = (W/(g*e))*r^2` -- printed 0.291 lb-in-s^2, stage-1-spec.md's own recomputed 0.29145. Includes AutomationDirect's own 1/e division. */
export const PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_LB_IN_S2 = 0.29145;
export const PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_KGM2 =
  PRINTED_LOAD_INERTIA_WITH_EFFICIENCY_LB_IN_S2 * LBF_IN_S2_TO_KG_M2;

/** `J_(pulleys+load) to motor` -- printed 0.0029 lb-in-s^2, stage-1-spec.md's own recomputed 0.002920. `(J_W_with_e + J_pulleys)/i^2`. */
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
