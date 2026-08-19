// Calculation trace for the index-table-motor-sizing module. Follows the
// same trace contract shape every sibling module's own trace.ts
// establishes: inertia, motion and acceleration torque (single index
// move), momentary and required torque, and a closing
// validity-and-assumptions section. Cites
// jp.oriental_motor.general_catalog_motor_fan_sizing and
// us.automationdirect.sureservo_selection_appendix only.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const ORIENTAL_MOTOR_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    clause: "Index Table -- Using Stepping Motors (pp. F-8-F-9)",
    label:
      '"Frictional load is omitted because it is negligible. Load torque is considered 0."',
  },
];

const AUTOMATIONDIRECT_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
    clause: "Index Table - Example Calculations (pp. B-14-B-16)",
    label: "Tmotor = Taccel + Trun, Trun = 0",
  },
];

export interface TraceInput {
  readonly tableMass: Quantity;
  readonly tableDiameter: Quantity;
  readonly attachedLoadInertia: Quantity;
  readonly gearRatio: Quantity;
  readonly indexAngle: Quantity;
  readonly indexTime: Quantity;
  readonly accelerationTime: Quantity;
  readonly loadTorque: Quantity;
  readonly motorRotorInertia: Quantity;
  readonly requiredTorqueSafetyFactor: Quantity;
  readonly inertiaRatioMaximum: Quantity;
  readonly tableInertiaKgM2: number;
  readonly loadInertiaKgM2: number;
  readonly reflectedLoadInertiaKgM2: number;
  readonly totalSystemInertiaKgM2: number;
  readonly inertiaRatio: number;
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
    title: "Table and mounted-load inertia, reflected and totaled",
    methodId: "motor_sizing.index_table.inertia",
    expression:
      "J_T = (1/8)*M_table*D^2; J_W = J_T+J_load; J_L = J_W/i^2; J_total = J_M+J_L; R_J = J_L/J_M",
    inputs: [
      {
        label: "M_table",
        value: input.tableMass,
        ref: "motor_sizing.index_table.table_mass",
      },
      {
        label: "D",
        value: input.tableDiameter,
        ref: "motor_sizing.index_table.table_diameter",
      },
      {
        label: "J_load",
        value: input.attachedLoadInertia,
        ref: "motor_sizing.index_table.attached_load_inertia",
      },
      {
        label: "i",
        value: input.gearRatio,
        ref: "motor_sizing.index_table.gear_ratio",
      },
      {
        label: "J_M",
        value: input.motorRotorInertia,
        ref: "motor_sizing.index_table.motor_rotor_inertia",
      },
    ],
    outputs: [
      {
        label: "J_T",
        value: makeQuantity(input.tableInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.index_table.table_inertia",
      },
      {
        label: "J_W",
        value: makeQuantity(input.loadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.index_table.load_inertia",
      },
      {
        label: "J_L",
        value: makeQuantity(input.reflectedLoadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.index_table.reflected_load_inertia",
      },
      {
        label: "J_total",
        value: makeQuantity(input.totalSystemInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.index_table.total_system_inertia",
      },
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.index_table.inertia_ratio",
      },
    ],
    sources: [...ORIENTAL_MOTOR_SOURCE, ...AUTOMATIONDIRECT_SOURCE],
    notes: [
      "The table is treated as a solid cylinder about its own rotation axis. Any mounted workpieces/fixtures are one engineer-supplied combined inertia figure, not modeled as discrete geometry (stage-2-contract.md 'Decisions' item 4).",
    ],
  };

  const motionStep = {
    node: "step" as const,
    id: "motion-and-acceleration-torque",
    title:
      "Operating (indexing) speed and acceleration torque over a single index move",
    methodId: "motor_sizing.index_table.acceleration_torque",
    expression:
      "omega_table = theta_index/(t_index-t_A); omega_motor = omega_table*i; alpha = omega_motor/t_A; T_A = J_total*alpha",
    inputs: [
      {
        label: "theta_index",
        value: input.indexAngle,
        ref: "motor_sizing.index_table.index_angle",
      },
      {
        label: "t_index",
        value: input.indexTime,
        ref: "motor_sizing.index_table.index_time",
      },
      {
        label: "t_A",
        value: input.accelerationTime,
        ref: "motor_sizing.index_table.acceleration_time",
      },
    ],
    outputs: [
      {
        label: "N_op",
        value: makeQuantity(input.operatingSpeedRadPerS, "rad/s"),
        ref: "motor_sizing.index_table.operating_speed",
      },
      {
        label: "T_A",
        value: makeQuantity(input.accelerationTorqueNm, "N*m"),
        ref: "motor_sizing.index_table.acceleration_torque",
      },
    ],
    sources: [...ORIENTAL_MOTOR_SOURCE, ...AUTOMATIONDIRECT_SOURCE],
    notes: [
      "Commanded directly in angular terms -- no linear-to-rotary radius conversion, unlike every sibling module's own target_velocity (stage-1-spec.md 'Genuinely different in kind').",
      "A single accelerate-decelerate-to-stop index move, not a repeating duty cycle: no effective (RMS) torque is computed.",
    ],
  };

  const requiredTorqueStep = {
    node: "step" as const,
    id: "momentary-and-required-torque",
    title: "Momentary torque and required motor rating",
    methodId: "motor_sizing.index_table.required_torque",
    expression: "T1 = T_A+T_L; T_req = T1*Sf; P_req = T_req*N_op",
    inputs: [
      {
        label: "T_L",
        value: input.loadTorque,
        ref: "motor_sizing.index_table.load_torque",
      },
      {
        label: "Sf",
        value: input.requiredTorqueSafetyFactor,
        ref: "motor_sizing.index_table.required_torque_safety_factor",
      },
    ],
    outputs: [
      {
        label: "T1",
        value: makeQuantity(input.momentaryTorqueNm, "N*m"),
        ref: "motor_sizing.index_table.momentary_torque",
      },
      {
        label: "T_req",
        value: makeQuantity(input.requiredTorqueNm, "N*m"),
        ref: "motor_sizing.index_table.required_torque",
      },
      {
        label: "P_req",
        value: makeQuantity(input.requiredPowerW, "W"),
        ref: "motor_sizing.index_table.required_power",
      },
    ],
    sources: ORIENTAL_MOTOR_SOURCE,
    notes: [
      "load_torque is a required, engineer-supplied input, not computed by this module -- both primary sources independently omit a load-torque formula for this mechanism, stating bearing/support friction is negligible (stage-1-spec.md 'The central finding'). It defaults to 0 N*m, the value both sources' own worked examples use.",
      "One combined safety factor (>= 1) -- this module computes no effective (RMS) torque distinct from its own momentary torque.",
    ],
  };

  const inertiaRatioCheckStep = {
    node: "step" as const,
    id: "inertia-ratio-check",
    title: "Inertia ratio against the engineer-supplied maximum",
    methodId: "motor_sizing.index_table.inertia_ratio",
    expression: "R_J <= R_Jmax",
    inputs: [
      {
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        ref: "motor_sizing.index_table.inertia_ratio_maximum",
      },
    ],
    outputs: [
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.index_table.inertia_ratio",
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
      id: "motion-and-torque",
      title: "Motion and acceleration torque",
      children: [motionStep],
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
          methodId: "motor_sizing.index_table.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "The table is treated as a rigid, disk-shaped solid cylinder about its own rotation axis.",
            "One index move (accelerate-decelerate-to-stop), not a repeating duty cycle -- no effective (RMS) torque is computed.",
            "load_torque is a required, engineer-supplied input, not computed -- both primary sources independently omit a formula for it.",
            "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 -- required_torque and required_power are reported required-spec values, not pass/fail checks.",
          ],
        },
      ],
    },
  ]);
}
