// Calculation trace for the belt-pulley-drive-motor-sizing module. Follows
// the same trace contract shape rack-pinion-motor-sizing@0.1.0's own
// trace.ts establishes: inertia, drive force and load torque, motion and
// acceleration torque (single accelerate event), momentary and required
// torque, and a closing validity-and-assumptions section. Cites
// jp.oriental_motor.general_catalog_motor_fan_sizing and
// us.automationdirect.sureservo_selection_appendix only.

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

export interface TraceInput {
  readonly orientation: EnumValue;
  readonly inclineAngle: Quantity;
  readonly gravity: Quantity;
  readonly frictionCoefficient: Quantity;
  readonly totalMovingMass: Quantity;
  readonly pulleyPitchDiameter: Quantity;
  readonly pulleyMass: Quantity;
  readonly idlerPulleyMass: Quantity;
  readonly beltMass: Quantity;
  readonly gearRatio: Quantity;
  readonly mechanicalEfficiency: Quantity;
  readonly externalForce: Quantity;
  readonly targetVelocity: Quantity;
  readonly accelerationTime: Quantity;
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
  readonly operatingSpeedRadPerS: number;
  readonly accelerationTorqueNm: number;
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
      "Both pulleys share one pitch diameter and rotate at the same angular speed as the drive shaft (no belt slip), so their inertias add directly rather than being reduced by a speed ratio (stage-2-contract.md 'Decisions' item 4).",
      "belt_inertia is 0 when belt_mass is 0, its own structural default (stage-2-contract.md 'Decisions' item 5).",
    ],
  };

  const loadTorqueStep = {
    node: "step" as const,
    id: "drive-force-and-load-torque",
    title: "Orientation-aware drive force and load torque",
    methodId: "motor_sizing.belt_pulley.load_torque",
    expression: "F = F_A + M*g*(sin(theta)+mu*cos(theta)); T_L = F*D/(2*eta*i)",
    inputs: [
      {
        label: "theta",
        value: input.inclineAngle,
        ref: "motion.axis.incline_angle",
      },
      { label: "g", value: input.gravity, ref: "motion.axis.gravity" },
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
      "Efficiency divides LOAD TORQUE (Oriental Motor's own convention, followed here), not inertia -- AutomationDirect's own source divides inertia instead, a real, disclosed modeling disagreement not adopted by this module (stage-1-spec.md 'A real disagreement between sources').",
    ],
  };

  const motionStep = {
    node: "step" as const,
    id: "motion-and-acceleration-torque",
    title:
      "Operating speed and acceleration torque over a single accelerate-to-speed event",
    methodId: "motor_sizing.belt_pulley.acceleration_torque",
    expression:
      "omega_pulley = V/(D/2); omega_motor = omega_pulley*i; alpha = omega_motor/t_A; T_A = J_total*alpha",
    inputs: [
      {
        label: "V",
        value: input.targetVelocity,
        ref: "motor_sizing.belt_pulley.target_velocity",
      },
      {
        label: "t_A",
        value: input.accelerationTime,
        ref: "motor_sizing.belt_pulley.acceleration_time",
      },
    ],
    outputs: [
      {
        label: "N_op",
        value: makeQuantity(input.operatingSpeedRadPerS, "rad/s"),
        ref: "motor_sizing.belt_pulley.operating_speed",
      },
      {
        label: "T_A",
        value: makeQuantity(input.accelerationTorqueNm, "N*m"),
        ref: "motor_sizing.belt_pulley.acceleration_torque",
      },
    ],
    sources: AUTOMATIONDIRECT_SOURCE,
    notes: [
      "A single accelerate-to-speed event, not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed -- no source found for this mechanism computes either (stage-1-spec.md 'Purpose').",
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
      "One combined safety factor (>= 1) -- this module computes no effective (RMS) torque distinct from its own momentary torque (stage-2-contract.md 'Decisions' item 6).",
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
      "The one real catalog-free pass/fail check in 0.1.0 -- every other torque/speed/power figure is a reported required-spec value (ADR-0011 'Output scope').",
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
      id: "force-and-torque",
      title: "Drive force, load torque, motion, and acceleration torque",
      children: [loadTorqueStep, motionStep],
    },
    {
      node: "section",
      id: "required-rating",
      title: "Required motor rating",
      children: [requiredTorqueStep, inertiaRatioCheckStep],
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
            "One accelerate-to-speed event, not a repeating duty cycle -- no deceleration-phase or effective (RMS) torque is computed.",
            "No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection -- a hardware-selection question out of this module's own scope.",
            "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 -- required_torque and required_power are reported required-spec values, not pass/fail checks.",
          ],
        },
      ],
    },
  ]);
}
