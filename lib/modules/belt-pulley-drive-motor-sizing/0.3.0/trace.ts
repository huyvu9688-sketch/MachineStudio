// Calculation trace for belt-pulley-drive-motor-sizing 0.3.0 (carried over
// unchanged from 0.2.0, except the removed gravity trace row -- see
// docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md).
// Extends 0.1.0's own trace contract shape with a motion-profile-
// derivation step and an effective-(RMS)-torque step; the inertia and
// drive-force/load-torque steps are otherwise unchanged. Cites
// jp.oriental_motor.general_catalog_motor_fan_sizing,
// us.automationdirect.sureservo_selection_appendix, and (added in 0.2.0)
// jp.oriental_motor.motor_sizing_calculations.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

const ORIENTAL_MOTOR_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    clause: "Wire Belt Mechanism, Rack and Pinion Mechanism (p. F-3)",
    label: "F = FA + m(sina + mu*cosa); TL = F*D/(2*eta*i)",
  },
];

const AUTOMATIONDIRECT_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
    clause: "Belt Drive (or Rack & Pinion) Equations (Table 1, p. B-6)",
    label:
      "T_run = (F_total*r)/i; J_total = J_motor+J_gear+((J_pulleys+J_belt+J_W)/i^2)",
  },
];

const ORIENTAL_MOTOR_SIZING_CALCULATIONS_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    clause:
      "Acceleration Torque; Calculation for the Effective Load Torque (Trms) for Servo Motors and BX Series Brushless Motors (pp. 5-6)",
    label:
      "Ta = (J0*i^2+JL)*(NM/t1); Trms = sqrt(((Ta+TL)^2*t1+TL^2*t2+(Td-TL)^2*t3)/tf)",
  },
];

export interface TraceInput {
  readonly orientation: EnumValue;
  readonly inclineAngle: Quantity;
  readonly frictionCoefficient: Quantity;
  readonly totalMovingMass: Quantity;
  readonly pulleyPitchDiameter: Quantity;
  readonly pulleyMass: Quantity;
  readonly idlerPulleyMass: Quantity;
  readonly beltMass: Quantity;
  readonly gearRatio: Quantity;
  readonly mechanicalEfficiency: Quantity;
  readonly externalForce: Quantity;
  readonly motionMode: EnumValue;
  readonly accelerationTime: Quantity;
  readonly decelerationTime: Quantity;
  readonly dwellTime: Quantity;
  readonly motorRotorInertia: Quantity;
  readonly requiredTorqueSafetyFactor: Quantity;
  readonly inertiaRatioMaximum: Quantity;
  readonly pulleyInertiaKgM2: number;
  readonly beltInertiaKgM2: number;
  readonly loadInertiaKgM2: number;
  readonly reflectedLoadInertiaKgM2: number;
  readonly totalSystemInertiaKgM2: number;
  readonly inertiaRatio: number;
  readonly forceN: number;
  readonly loadTorqueNm: number;
  readonly targetVelocityMps: number;
  readonly travelDistanceM: number;
  readonly constantVelocityTimeS: number;
  readonly cycleTimeS: number;
  readonly operatingSpeedRadPerS: number;
  readonly accelerationTorqueNm: number;
  readonly decelerationTorqueNm: number;
  readonly effectiveTorqueNm: number;
  readonly momentaryTorqueNm: number;
  readonly requiredTorqueNm: number;
  readonly requiredPowerW: number;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const inertiaStep = {
    node: "step" as const,
    id: "geometry-and-inertia",
    title: "Pulley, belt, and load inertia, reflected and totaled",
    methodId: "motor_sizing.belt_pulley.inertia",
    expression:
      "J_pulleys = (1/8)*(M_drive+M_idler)*D^2; J_belt = M_belt*(D/2)^2; J_W = J_pulleys+J_belt+M*(D/2)^2; J_L = J_W/i^2; J_total = J_M+J_L; R_J = J_L/J_M",
    inputs: [
      {
        label: "D",
        value: input.pulleyPitchDiameter,
        ref: "motor_sizing.belt_pulley.pulley_pitch_diameter",
      },
      {
        label: "M_drive",
        value: input.pulleyMass,
        ref: "motor_sizing.belt_pulley.pulley_mass",
      },
      {
        label: "M_idler",
        value: input.idlerPulleyMass,
        ref: "motor_sizing.belt_pulley.idler_pulley_mass",
      },
      {
        label: "M_belt",
        value: input.beltMass,
        ref: "motor_sizing.belt_pulley.belt_mass",
      },
      {
        label: "M",
        value: input.totalMovingMass,
        ref: "motion.axis.total_moving_mass",
      },
      {
        label: "i",
        value: input.gearRatio,
        ref: "motor_sizing.belt_pulley.gear_ratio",
      },
      {
        label: "J_M",
        value: input.motorRotorInertia,
        ref: "motor_sizing.belt_pulley.motor_rotor_inertia",
      },
    ],
    outputs: [
      {
        label: "J_pulleys",
        value: makeQuantity(input.pulleyInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.pulley_inertia",
      },
      {
        label: "J_belt",
        value: makeQuantity(input.beltInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.belt_inertia",
      },
      {
        label: "J_W",
        value: makeQuantity(input.loadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.load_inertia",
      },
      {
        label: "J_L",
        value: makeQuantity(input.reflectedLoadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.reflected_load_inertia",
      },
      {
        label: "J_total",
        value: makeQuantity(input.totalSystemInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.belt_pulley.total_system_inertia",
      },
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.belt_pulley.inertia_ratio",
      },
    ],
    sources: [...ORIENTAL_MOTOR_SOURCE, ...AUTOMATIONDIRECT_SOURCE],
    notes: [
      "Both pulleys share one pitch diameter and rotate at the same angular speed as the drive shaft (no belt slip), so their inertias add directly.",
      "belt_inertia is 0 when belt_mass is 0, its own structural default.",
    ],
  };

  const loadTorqueStep = {
    node: "step" as const,
    id: "drive-force-and-load-torque",
    title: "Orientation-aware drive force and load torque",
    methodId: "motor_sizing.belt_pulley.load_torque",
    // 0.3.0: g = 9.80665 m/s^2, hardcoded (no longer an input) -- see
    // math.ts's own STANDARD_GRAVITY_M_PER_S2.
    expression:
      "F = F_A + M*g*(sin(theta)+mu*cos(theta)), g=9.80665; T_L = F*D/(2*eta*i)",
    inputs: [
      {
        label: "theta",
        value: input.inclineAngle,
        ref: "motion.axis.incline_angle",
      },
      {
        label: "mu",
        value: input.frictionCoefficient,
        ref: "motion.axis.friction_coefficient",
      },
      {
        label: "F_A",
        value: input.externalForce,
        ref: "motor_sizing.belt_pulley.external_force",
      },
      {
        label: "eta",
        value: input.mechanicalEfficiency,
        ref: "motor_sizing.belt_pulley.mechanical_efficiency",
      },
    ],
    outputs: [
      {
        label: "T_L",
        value: makeQuantity(input.loadTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.load_torque",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      `Orientation: ${String(input.orientation.value)}.`,
      "Load torque is assumed constant across all four motion phases (accelerate/run/decelerate/dwell) -- this mechanism's own physics, not an approximation across a module boundary.",
    ],
  };

  const motionProfileStep = {
    node: "step" as const,
    id: "motion-profile",
    title:
      "Repeating trapezoidal motion cycle (velocity-first or distance-first)",
    methodId: "motor_sizing.belt_pulley.motion_profile",
    expression:
      "velocity mode: S = V*(t1+t3)/2 + V*t2, tf = t1+t2+t3+t4; distance mode: t2 = tf-t1-t3-t4, V = S/(t2+(t1+t3)/2)",
    inputs: [
      {
        label: "t1",
        value: input.accelerationTime,
        ref: "motor_sizing.belt_pulley.acceleration_time",
      },
      {
        label: "t3",
        value: input.decelerationTime,
        ref: "motor_sizing.belt_pulley.deceleration_time",
      },
      {
        label: "t4",
        value: input.dwellTime,
        ref: "motor_sizing.belt_pulley.dwell_time",
      },
    ],
    outputs: [
      {
        label: "V",
        value: makeQuantity(input.targetVelocityMps, "m/s"),
        ref: "motor_sizing.belt_pulley.target_velocity",
      },
      {
        label: "S",
        value: makeQuantity(input.travelDistanceM, "m"),
        ref: "motor_sizing.belt_pulley.travel_distance",
      },
      {
        label: "t2",
        value: makeQuantity(input.constantVelocityTimeS, "s"),
        ref: "motor_sizing.belt_pulley.constant_velocity_time",
      },
      {
        label: "tf",
        value: makeQuantity(input.cycleTimeS, "s"),
        ref: "motor_sizing.belt_pulley.cycle_time",
      },
      {
        label: "N_op",
        value: makeQuantity(input.operatingSpeedRadPerS, "rad/s"),
        ref: "motor_sizing.belt_pulley.operating_speed",
      },
    ],
    sources: [],
    notes: [
      `motion_mode: ${String(input.motionMode.value)} -- the other side (velocity/distance and run-time/cycle-time) is derived, not supplied, and always reported regardless of mode.`,
      "This trapezoidal motion-cycle derivation is this module's own design decision, not an external manufacturer method (belt-pulley-drive-motor-sizing-0.2.0-design.md 'Input Mode').",
    ],
  };

  const torqueStep = {
    node: "step" as const,
    id: "acceleration-and-deceleration-torque",
    title: "Acceleration and deceleration torque",
    methodId: "motor_sizing.belt_pulley.acceleration_torque",
    expression:
      "alpha_accel = N_op/t1; T_A = J_total*alpha_accel; alpha_decel = N_op/t3; T_D = J_total*alpha_decel",
    inputs: [],
    outputs: [
      {
        label: "T_A",
        value: makeQuantity(input.accelerationTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.acceleration_torque",
      },
      {
        label: "T_D",
        value: makeQuantity(input.decelerationTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.deceleration_torque",
      },
    ],
    sources: ORIENTAL_MOTOR_SIZING_CALCULATIONS_SOURCE,
    notes: [
      "T_D is symmetric to T_A -- the same alpha=omega/t, T=J*alpha shape, over deceleration_time instead of acceleration_time.",
    ],
  };

  const requiredTorqueStep = {
    node: "step" as const,
    id: "momentary-and-required-torque",
    title: "Momentary torque and required motor rating",
    methodId: "motor_sizing.belt_pulley.required_torque",
    expression: "T1 = T_A+T_L; T_req = T1*Sf; P_req = T_req*N_op",
    inputs: [
      {
        label: "Sf",
        value: input.requiredTorqueSafetyFactor,
        ref: "motor_sizing.belt_pulley.required_torque_safety_factor",
      },
    ],
    outputs: [
      {
        label: "T1",
        value: makeQuantity(input.momentaryTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.momentary_torque",
      },
      {
        label: "T_req",
        value: makeQuantity(input.requiredTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.required_torque",
      },
      {
        label: "P_req",
        value: makeQuantity(input.requiredPowerW, "W"),
        ref: "motor_sizing.belt_pulley.required_power",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      "T_req is governed by the acceleration phase (T1 = T_A+T_L), additive to, not replaced by, effective_torque below.",
    ],
  };

  const effectiveTorqueStep = {
    node: "step" as const,
    id: "effective-torque",
    title: "Effective (RMS) torque over the repeating cycle",
    methodId: "motor_sizing.belt_pulley.effective_torque",
    expression:
      "Trms = sqrt(((T_A+T_L)^2*t1 + T_L^2*t2 + (T_D-T_L)^2*t3) / tf)",
    inputs: [],
    outputs: [
      {
        label: "Trms",
        value: makeQuantity(input.effectiveTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.effective_torque",
      },
    ],
    sources: ORIENTAL_MOTOR_SIZING_CALCULATIONS_SOURCE,
    notes: [
      "Dwell time (t4) contributes zero torque to the numerator but counts toward tf, matching how a servo's own thermal/RMS rating averages over idle time too.",
      "No pass/fail check is applied to effective_torque in 0.2.0 -- no source found gives a universal continuous-torque acceptance criterion for this mechanism family.",
      "No published worked example carries printed per-phase torque figures for this formula -- a disclosed, open evidence gap.",
    ],
  };

  const inertiaRatioCheckStep = {
    node: "step" as const,
    id: "inertia-ratio-check",
    title: "Inertia ratio against the engineer-supplied maximum",
    methodId: "motor_sizing.belt_pulley.inertia_ratio",
    expression: "R_J <= R_Jmax",
    inputs: [
      {
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        ref: "motor_sizing.belt_pulley.inertia_ratio_maximum",
      },
    ],
    outputs: [
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.belt_pulley.inertia_ratio",
      },
    ],
    sources: [],
    notes: [
      "The one real catalog-free pass/fail check in 0.2.0, unchanged from 0.1.0.",
    ],
  };

  return buildCalculationTrace([
    {
      node: "section",
      id: "inertia",
      title: "Inertia",
      children: [inertiaStep],
    },
    {
      node: "section",
      id: "motion-and-torque",
      title:
        "Motion profile, drive force, load torque, and acceleration/deceleration torque",
      children: [loadTorqueStep, motionProfileStep, torqueStep],
    },
    {
      node: "section",
      id: "required-rating",
      title: "Required motor rating",
      children: [
        requiredTorqueStep,
        effectiveTorqueStep,
        inertiaRatioCheckStep,
      ],
    },
    {
      node: "section",
      id: "validity-and-assumptions",
      title: "Validity and assumptions",
      children: [
        {
          node: "step",
          id: "scope-notes",
          title: "Scope and assumptions",
          methodId: "motor_sizing.belt_pulley.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "Both pulleys share one pitch diameter -- no source found gives an unequal-diameter belt-drive formula.",
            "A repeating accelerate/run/decelerate/dwell cycle with load_torque assumed constant across all four phases.",
            "No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection -- a hardware-selection question out of this module's own scope.",
            "No candidate motor's own rated/peak torque is taken as an input -- required_torque, effective_torque, and required_power are reported required-spec values, not pass/fail checks.",
          ],
        },
      ],
    },
  ]);
}
