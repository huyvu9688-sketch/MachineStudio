// Calculation trace for the direct-drive-conveyor-motor-sizing module.
// Follows the trace contract proposed in context/modules/
// direct-drive-conveyor-motor-sizing/stage-1-spec.md "Trace Contract
// (Proposed)": geometry/inertia, drive force and load torque, the single
// accelerate-to-speed motion event and its acceleration torque, momentary
// and required torque, and a closing validity-and-assumptions section.
// Cites the actual formula each step applies, the same discipline every
// other module in this project already established.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const OMRON_INERTIA_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.omron.servo_motor_selection_guide@csm-tg-e-3-1",
    ),
    clause: "Inertia when Carrying Object via Conveyor Belt (p. 8)",
    label: "JW = J1+J2+J3+J4 = f(roller/belt/load geometry and mass)",
  },
];

const ORIENTAL_MOTOR_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    clause: "Belt and Pully / Conveyor sizing examples (pp. F-8 - F-9)",
    label: "F = mu*m; TL = F*D/(2*eta); TM = (TL+Ta)*Sf",
  },
];

export interface TraceInput {
  readonly driveRollerDiameter: Quantity;
  readonly driveRollerMass: Quantity;
  readonly idlerRollerDiameter: Quantity;
  readonly idlerRollerMass: Quantity;
  readonly beltMass: Quantity;
  readonly carriedLoadMass: Quantity;
  readonly beltFrictionCoefficient: Quantity;
  readonly mechanicalEfficiency: Quantity;
  readonly gravity: Quantity;
  readonly targetBeltSpeed: Quantity;
  readonly accelerationTime: Quantity;
  readonly motorRotorInertia: Quantity;
  readonly requiredTorqueSafetyFactor: Quantity;
  readonly inertiaRatioMaximum: Quantity;
  readonly driveRollerInertiaKgM2: number;
  readonly reflectedLoadInertiaKgM2: number;
  readonly totalSystemInertiaKgM2: number;
  readonly inertiaRatio: number;
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
    title: "Roller, belt, and load inertia, reflected and totaled",
    methodId: "motor_sizing.direct_drive_conveyor.inertia",
    expression:
      "J1 = (1/8)*M1*D1^2; J2 = (1/8)*M2*D2^2*(D1/D2)^2; J3 = M4*(D1/2)^2; J4 = M3*(D1/2)^2; J_L = J2+J3+J4; J_total = J_M+J1+J_L; R_J = J_L/J_M",
    inputs: [
      {
        label: "D1",
        value: input.driveRollerDiameter,
        ref: "motor_sizing.direct_drive_conveyor.drive_roller_diameter",
      },
      {
        label: "M1",
        value: input.driveRollerMass,
        ref: "motor_sizing.direct_drive_conveyor.drive_roller_mass",
      },
      {
        label: "D2",
        value: input.idlerRollerDiameter,
        ref: "motor_sizing.direct_drive_conveyor.idler_roller_diameter",
      },
      {
        label: "M2",
        value: input.idlerRollerMass,
        ref: "motor_sizing.direct_drive_conveyor.idler_roller_mass",
      },
      {
        label: "M4",
        value: input.beltMass,
        ref: "motor_sizing.direct_drive_conveyor.belt_mass",
      },
      {
        label: "M3",
        value: input.carriedLoadMass,
        ref: "motor_sizing.direct_drive_conveyor.carried_load_mass",
      },
      {
        label: "J_M",
        value: input.motorRotorInertia,
        ref: "motor_sizing.direct_drive_conveyor.motor_rotor_inertia",
      },
    ],
    outputs: [
      {
        label: "J_L",
        value: makeQuantity(input.reflectedLoadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.direct_drive_conveyor.reflected_load_inertia",
      },
      {
        label: "J_total",
        value: makeQuantity(input.totalSystemInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.direct_drive_conveyor.total_system_inertia",
      },
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.direct_drive_conveyor.inertia_ratio",
      },
    ],
    sources: [...OMRON_INERTIA_SOURCE, ...ORIENTAL_MOTOR_SOURCE],
    notes: [
      "J1 (the drive roller's own inertia) is computed internally and folded directly into J_total rather than exposed as its own port -- a naming-consistency split from Omron's own single combined JW, not a physics difference (stage-2-contract.md 'Method Sources').",
    ],
  };

  const loadTorqueStep = {
    node: "step" as const,
    id: "drive-force-and-load-torque",
    title: "Friction-driven drive force and load torque",
    methodId: "motor_sizing.direct_drive_conveyor.load_torque",
    expression: "F = mu*(M4+M3)*g; T_L = F*D1/(2*eta)",
    inputs: [
      {
        label: "mu",
        value: input.beltFrictionCoefficient,
        ref: "motor_sizing.direct_drive_conveyor.belt_friction_coefficient",
      },
      { label: "g", value: input.gravity, ref: "motion.axis.gravity" },
      {
        label: "eta",
        value: input.mechanicalEfficiency,
        ref: "motor_sizing.direct_drive_conveyor.mechanical_efficiency",
      },
    ],
    outputs: [
      {
        label: "T_L",
        value: makeQuantity(input.loadTorqueNm, "N*m"),
        ref: "motor_sizing.direct_drive_conveyor.load_torque",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      "No preload-nut term -- a conveyor has no preload nut, genuinely simpler than motor_sizing.ball_screw.load_torque (stage-1-spec.md 'Candidate Methods' item 2).",
    ],
  };

  const motionStep = {
    node: "step" as const,
    id: "motion-and-acceleration-torque",
    title: "Operating speed and acceleration torque over a single accelerate-to-speed event",
    methodId: "motor_sizing.direct_drive_conveyor.acceleration_torque",
    expression:
      "omega = V_belt/(D1/2); alpha = omega/t_A; T_A = J_total*alpha",
    inputs: [
      {
        label: "V_belt",
        value: input.targetBeltSpeed,
        ref: "motor_sizing.direct_drive_conveyor.target_belt_speed",
      },
      {
        label: "t_A",
        value: input.accelerationTime,
        ref: "motor_sizing.direct_drive_conveyor.acceleration_time",
      },
    ],
    outputs: [
      {
        label: "N_op",
        value: makeQuantity(input.operatingSpeedRadPerS, "rad/s"),
        ref: "motor_sizing.direct_drive_conveyor.operating_speed",
      },
      {
        label: "T_A",
        value: makeQuantity(input.accelerationTorqueNm, "N*m"),
        ref: "motor_sizing.direct_drive_conveyor.acceleration_torque",
      },
    ],
    sources: [...ORIENTAL_MOTOR_SOURCE, ...OMRON_INERTIA_SOURCE],
    notes: [
      "A single accelerate-to-speed event, not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed (stage-2-contract.md 'Decisions' item 3) -- a genuine scope difference from motor_sizing.ball_screw, evidence-driven: no source read for this mechanism frames a conveyor's own required motor sizing as a repeating cycle.",
    ],
  };

  const requiredTorqueStep = {
    node: "step" as const,
    id: "momentary-and-required-torque",
    title: "Momentary torque and required motor rating",
    methodId: "motor_sizing.direct_drive_conveyor.required_torque",
    expression: "T1 = T_A+T_L; T_req = T1*Sf; P_req = T_req*N_op",
    inputs: [
      {
        label: "Sf",
        value: input.requiredTorqueSafetyFactor,
        ref: "motor_sizing.direct_drive_conveyor.required_torque_safety_factor",
      },
    ],
    outputs: [
      {
        label: "T1",
        value: makeQuantity(input.momentaryTorqueNm, "N*m"),
        ref: "motor_sizing.direct_drive_conveyor.momentary_torque",
      },
      {
        label: "T_req",
        value: makeQuantity(input.requiredTorqueNm, "N*m"),
        ref: "motor_sizing.direct_drive_conveyor.required_torque",
      },
      {
        label: "P_req",
        value: makeQuantity(input.requiredPowerW, "W"),
        ref: "motor_sizing.direct_drive_conveyor.required_power",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      "One combined safety factor (>= 1), not motor_sizing.ball_screw's own two separate RMS/momentary margins -- this module computes no effective (RMS) torque distinct from its own momentary torque (stage-2-contract.md 'Decisions' item 4).",
      "Neither of this module's own two fully-verified reference examples (General Catalog Technical Reference pp. F-8 - F-9) computes an acceleration-torque term at all -- both derive their own final required-torque figure from load torque alone, with a safety factor. T_A/T1/T_req are therefore validated at the formula level (Ta = J*alpha, an already-established lib/engine/mechanics relationship) but not against either reference example's own printed final figure -- see validation.ts.",
    ],
  };

  const inertiaRatioCheckStep = {
    node: "step" as const,
    id: "inertia-ratio-check",
    title: "Inertia ratio against the engineer-supplied maximum",
    methodId: "motor_sizing.direct_drive_conveyor.inertia_ratio",
    expression: "R_J <= R_Jmax",
    inputs: [
      {
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        ref: "motor_sizing.direct_drive_conveyor.inertia_ratio_maximum",
      },
    ],
    outputs: [
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.direct_drive_conveyor.inertia_ratio",
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
          methodId: "motor_sizing.direct_drive_conveyor.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "Horizontal only -- no source found gives an inclined-conveyor formula or worked example (stage-1-spec.md 'Purpose').",
            "Direct drive only: no gear ratio in 0.1.0's own input schema at all (not one fixed at 1) -- motor shaft and drive-roller shaft are the same shaft (stage-2-contract.md 'Decisions' item 5).",
            "One accelerate-to-speed event, not a repeating duty cycle -- no deceleration-phase or effective (RMS) torque is computed.",
            "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 -- required_torque and required_power are reported required-spec values, not pass/fail checks.",
          ],
        },
      ],
    },
  ]);
}
