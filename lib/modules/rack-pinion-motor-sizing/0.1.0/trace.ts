// Calculation trace for the rack-pinion-motor-sizing module. Follows the
// trace contract proposed in context/modules/rack-pinion-motor-sizing/
// stage-1-spec.md "Trace Contract (Proposed)": inertia, drive force and
// load torque, motion and acceleration torque (single accelerate event),
// momentary and required torque, and a closing validity-and-assumptions
// section. Cites jp.oriental_motor.general_catalog_motor_fan_sizing and
// us.andantex.modular_rack_pinion_system only -- Atlanta Drive Systems
// stays an internal-only benchmark, never cited in a customer-facing
// trace (stage-1-spec.md "Candidate Methods" item 4).

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

const ANDANTEX_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.andantex.modular_rack_pinion_system@web-2026-08-13",
    ),
    clause: "Rack & Pinion Calculations & Selection (p. 62)",
    label: "Fr = mu*M*g+M*a+F (horizontal) / M*g+M*a+F (vertical); Tp = Fr*d/2",
  },
];

export interface TraceInput {
  readonly orientation: EnumValue;
  readonly inclineAngle: Quantity;
  readonly gravity: Quantity;
  readonly frictionCoefficient: Quantity;
  readonly totalMovingMass: Quantity;
  readonly pinionPitchDiameter: Quantity;
  readonly pinionMass: Quantity;
  readonly gearRatio: Quantity;
  readonly mechanicalEfficiency: Quantity;
  readonly externalForce: Quantity;
  readonly targetVelocity: Quantity;
  readonly accelerationTime: Quantity;
  readonly motorRotorInertia: Quantity;
  readonly requiredTorqueSafetyFactor: Quantity;
  readonly inertiaRatioMaximum: Quantity;
  readonly pinionInertiaKgM2: number;
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
    title: "Pinion and load inertia, reflected and totaled",
    methodId: "motor_sizing.rack_pinion.inertia",
    expression:
      "J_pinion = (1/8)*M_pinion*D^2; J_W = J_pinion+M*(D/2)^2; J_L = J_W/i^2; J_total = J_M+J_L; R_J = J_L/J_M",
    inputs: [
      {
        label: "D",
        value: input.pinionPitchDiameter,
        ref: "motor_sizing.rack_pinion.pinion_pitch_diameter",
      },
      {
        label: "M_pinion",
        value: input.pinionMass,
        ref: "motor_sizing.rack_pinion.pinion_mass",
      },
      {
        label: "M",
        value: input.totalMovingMass,
        ref: "motion.axis.total_moving_mass",
      },
      {
        label: "i",
        value: input.gearRatio,
        ref: "motor_sizing.rack_pinion.gear_ratio",
      },
      {
        label: "J_M",
        value: input.motorRotorInertia,
        ref: "motor_sizing.rack_pinion.motor_rotor_inertia",
      },
    ],
    outputs: [
      {
        label: "J_pinion",
        value: makeQuantity(input.pinionInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.rack_pinion.pinion_inertia",
      },
      {
        label: "J_W",
        value: makeQuantity(input.loadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.rack_pinion.load_inertia",
      },
      {
        label: "J_L",
        value: makeQuantity(input.reflectedLoadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.rack_pinion.reflected_load_inertia",
      },
      {
        label: "J_total",
        value: makeQuantity(input.totalSystemInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.rack_pinion.total_system_inertia",
      },
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.rack_pinion.inertia_ratio",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      "The rack itself is treated as infinitely rigid/massless -- no source found this session gives the rack its own mass or inertia term (stage-1-spec.md 'Evidence Gaps').",
    ],
  };

  const loadTorqueStep = {
    node: "step" as const,
    id: "drive-force-and-load-torque",
    title: "Orientation-aware drive force and load torque",
    methodId: "motor_sizing.rack_pinion.load_torque",
    expression: "F = F_A + M*g*(sin(theta)+mu*cos(theta)); T_L = F*D/(2*eta*i)",
    inputs: [
      { label: "theta", value: input.inclineAngle, ref: "motion.axis.incline_angle" },
      { label: "g", value: input.gravity, ref: "motion.axis.gravity" },
      {
        label: "mu",
        value: input.frictionCoefficient,
        ref: "motion.axis.friction_coefficient",
      },
      {
        label: "F_A",
        value: input.externalForce,
        ref: "motor_sizing.rack_pinion.external_force",
      },
      {
        label: "eta",
        value: input.mechanicalEfficiency,
        ref: "motor_sizing.rack_pinion.mechanical_efficiency",
      },
    ],
    outputs: [
      {
        label: "T_L",
        value: makeQuantity(input.loadTorqueNm, "N*m"),
        ref: "motor_sizing.rack_pinion.load_torque",
      },
    ],
    sources: [...ORIENTAL_MOTOR_SOURCE, ...ANDANTEX_SOURCE],
    notes: [
      `Orientation: ${String(input.orientation.value)}.`,
      "Identical in shape to ball-screw-motor-sizing@0.1.0's own drive-force formula, tracing to the same source page (stage-1-spec.md 'Relationship to Existing and Planned Modules').",
    ],
  };

  const motionStep = {
    node: "step" as const,
    id: "motion-and-acceleration-torque",
    title:
      "Operating speed and acceleration torque over a single accelerate-to-speed event",
    methodId: "motor_sizing.rack_pinion.acceleration_torque",
    expression:
      "omega_pinion = V/(D/2); omega_motor = omega_pinion*i; alpha = omega_motor/t_A; T_A = J_total*alpha",
    inputs: [
      {
        label: "V",
        value: input.targetVelocity,
        ref: "motor_sizing.rack_pinion.target_velocity",
      },
      {
        label: "t_A",
        value: input.accelerationTime,
        ref: "motor_sizing.rack_pinion.acceleration_time",
      },
    ],
    outputs: [
      {
        label: "N_op",
        value: makeQuantity(input.operatingSpeedRadPerS, "rad/s"),
        ref: "motor_sizing.rack_pinion.operating_speed",
      },
      {
        label: "T_A",
        value: makeQuantity(input.accelerationTorqueNm, "N*m"),
        ref: "motor_sizing.rack_pinion.acceleration_torque",
      },
    ],
    sources: ANDANTEX_SOURCE,
    notes: [
      "A single accelerate-to-speed event, not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed -- no source found for this mechanism computes either (stage-1-spec.md 'Purpose').",
    ],
  };

  const requiredTorqueStep = {
    node: "step" as const,
    id: "momentary-and-required-torque",
    title: "Momentary torque and required motor rating",
    methodId: "motor_sizing.rack_pinion.required_torque",
    expression: "T1 = T_A+T_L; T_req = T1*Sf; P_req = T_req*N_op",
    inputs: [
      {
        label: "Sf",
        value: input.requiredTorqueSafetyFactor,
        ref: "motor_sizing.rack_pinion.required_torque_safety_factor",
      },
    ],
    outputs: [
      {
        label: "T1",
        value: makeQuantity(input.momentaryTorqueNm, "N*m"),
        ref: "motor_sizing.rack_pinion.momentary_torque",
      },
      {
        label: "T_req",
        value: makeQuantity(input.requiredTorqueNm, "N*m"),
        ref: "motor_sizing.rack_pinion.required_torque",
      },
      {
        label: "P_req",
        value: makeQuantity(input.requiredPowerW, "W"),
        ref: "motor_sizing.rack_pinion.required_power",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      "One combined safety factor (>= 1), not ball-screw-motor-sizing@0.1.0's own two separate RMS/momentary margins -- this module computes no effective (RMS) torque distinct from its own momentary torque (stage-2-contract.md 'Decisions' item 5).",
    ],
  };

  const inertiaRatioCheckStep = {
    node: "step" as const,
    id: "inertia-ratio-check",
    title: "Inertia ratio against the engineer-supplied maximum",
    methodId: "motor_sizing.rack_pinion.inertia_ratio",
    expression: "R_J <= R_Jmax",
    inputs: [
      {
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        ref: "motor_sizing.rack_pinion.inertia_ratio_maximum",
      },
    ],
    outputs: [
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.rack_pinion.inertia_ratio",
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
          methodId: "motor_sizing.rack_pinion.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "The rack itself is treated as infinitely rigid/massless -- no source found this session gives it a mass or inertia term.",
            "One accelerate-to-speed event, not a repeating duty cycle -- no deceleration-phase or effective (RMS) torque is computed.",
            "No rack/pinion gear-tooth mechanical-strength check (root bending fatigue, Hertzian pitting fatigue) -- a hardware-selection question out of this module's own scope.",
            "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 -- required_torque and required_power are reported required-spec values, not pass/fail checks.",
          ],
        },
      ],
    },
  ]);
}
