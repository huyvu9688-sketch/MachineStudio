// Calculation trace for the drive-train module. Follows the trace contract
// proposed in context/modules/drive-train/stage-1-spec.md "Trace Contract
// (Proposed)": reflected inertia, per-case acceleration/momentary/
// effective/regenerative-energy torque and energy, reported gearbox and
// brake catalog values, and a closing validity-and-assumptions section.
// Cites the actual formula each step applies, distinguishing elementary
// geometry/arithmetic (no citation) from a manufacturer-specific method
// (cited) — the same discipline every other module in this project already
// established.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const OMRON_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.omron.servo_motor_selection_guide@csm-tg-e-3-1",
    ),
    clause: "Inertia Formulas / Acceleration-Deceleration Torque Formula",
    label: "J_total = J_M + J_L; T_A = J_total * alpha",
  },
];

const RMS_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.omron.servo_motor_selection_guide@csm-tg-e-3-1",
    ),
    clause: "Calculation of Maximum Momentary Torque, Effective Torque",
    label: "T1 = T_A + T_L; Trms = sqrt(sum(T_i^2*t_i) / sum(t_i))",
  },
];

const REGEN_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.celera_motion.shunt_resistor_regenerative_braking@web-2026-08-10",
    ),
    clause: "kinetic-energy term underlying the resistor-sizing methodology",
    label: "E = J_total*omega^2/2",
  },
];

export type DriveTrainCase = "normal" | "peak";

export interface TraceCaseInput {
  readonly driveTorque: Quantity;
  readonly linearVelocity: Quantity;
  readonly loadTorqueNm: number;
  readonly operatingSpeedRadPerS: number;
  readonly momentaryTorqueNm: number;
  readonly effectiveTorqueNm: number;
  readonly regenEnergyJ: number;
}

export interface TraceInput {
  readonly lead: Quantity;
  readonly gearRatio: Quantity;
  readonly gearboxEfficiency: Quantity | undefined;
  readonly motorRatedTorque: Quantity;
  readonly motorPeakTorque: Quantity;
  readonly motorRatedSpeed: Quantity;
  readonly motorRotorInertia: Quantity;
  readonly reflectedLoadInertia: Quantity;
  readonly totalSystemInertiaKgM2: number;
  readonly inertiaRatio: number;
  readonly inertiaRatioMaximum: Quantity;
  readonly rmsTorqueMargin: Quantity;
  readonly peakTorqueMargin: Quantity;
  readonly regenAbsorptionCapacity: Quantity | undefined;
  readonly brakeRatedTorque: Quantity | undefined;
  readonly peakAcceleration: Quantity;
  readonly peakDeceleration: Quantity;
  readonly rmsAcceleration: Quantity;
  readonly accelerationTorqueNm: number;
  readonly cases: Readonly<Record<DriveTrainCase, TraceCaseInput>>;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const CASES: readonly DriveTrainCase[] = ["normal", "peak"];
  const isGeared = input.gearRatio.value !== 1;

  const inertiaStep = {
    node: "step" as const,
    id: "total-system-inertia",
    title: "Total system inertia and inertia ratio",
    methodId: "drive.total_system_inertia",
    expression: "J_total = J_M + J_L; R_J = J_L / J_M",
    inputs: [
      {
        label: "J_M",
        value: input.motorRotorInertia,
        ref: "drive.motor_rotor_inertia",
      },
      {
        label: "J_L",
        value: input.reflectedLoadInertia,
        ref: "drive.reflected_load_inertia",
      },
    ],
    outputs: [
      {
        label: "J_total",
        value: makeQuantity(input.totalSystemInertiaKgM2, "kg*m^2"),
        ref: "drive.total_system_inertia",
      },
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "drive.inertia_ratio",
      },
    ],
    sources: OMRON_SOURCE,
  };

  const accelTorqueStep = {
    node: "step" as const,
    id: "acceleration-torque",
    title: "Acceleration/deceleration torque",
    methodId: "drive.acceleration_torque",
    expression: "alpha = (a/lead)*2*pi*gearRatio; T_A = J_total*alpha",
    inputs: [
      {
        label: "a_accel",
        value: input.peakAcceleration,
        ref: "motion.profile.peak_acceleration",
      },
      {
        label: "a_decel",
        value: input.peakDeceleration,
        ref: "motion.profile.peak_deceleration",
      },
      { label: "lead", value: input.lead, ref: "screw.lead" },
      { label: "gearRatio", value: input.gearRatio, ref: "screw.gear_ratio" },
    ],
    outputs: [
      {
        label: "T_A",
        value: makeQuantity(input.accelerationTorqueNm, "N*m"),
        ref: "drive.acceleration_torque",
      },
    ],
    sources: OMRON_SOURCE,
    notes: [
      "Uses the larger-magnitude of the accel/decel figures as a single conservative value — see math.ts resolveAccelerationTorque's own doc comment.",
    ],
  };

  const speedSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `operating-speed-${loadCase}`,
      title: `Motor-shaft operating speed (${loadCase})`,
      methodId: "drive.operating_speed",
      expression: "n_screw = v/lead; N_op = n_screw*2*pi*gearRatio",
      inputs: [
        {
          label: "v",
          value: c.linearVelocity,
          ref: "motion.axis.case_linear_velocity",
        },
        { label: "lead", value: input.lead, ref: "screw.lead" },
        {
          label: "gearRatio",
          value: input.gearRatio,
          ref: "screw.gear_ratio",
        },
      ],
      outputs: [
        {
          label: "N_op",
          value: makeQuantity(c.operatingSpeedRadPerS, "rad/s"),
          ref: "drive.operating_speed",
        },
      ],
    };
  });

  const loadTorqueSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `gearbox-derated-load-torque-${loadCase}`,
      title: `Gearbox-derated load torque (${loadCase})`,
      methodId: "drive.gearbox_derated_load_torque",
      expression: "T_L = screw.drive_torque / eta_g",
      inputs: [
        {
          label: "screw.drive_torque",
          value: c.driveTorque,
          ref: "screw.drive_torque",
        },
        {
          label: "eta_g",
          value: input.gearboxEfficiency ?? makeQuantity(1, "ratio"),
          ...(isGeared && { ref: "drive.gearbox_efficiency" }),
        },
      ],
      outputs: [{ label: "T_L", value: makeQuantity(c.loadTorqueNm, "N*m") }],
      notes: isGeared
        ? []
        : [
            "gear_ratio = 1: no gearbox is declared, so eta_g = 1 (no additional derating), not a registry default.",
          ],
    };
  });

  const momentarySteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `momentary-torque-${loadCase}`,
      title: `Maximum momentary torque (${loadCase})`,
      methodId: "drive.momentary_torque",
      expression: "T1 = T_A + T_L",
      inputs: [
        {
          label: "T_A",
          value: makeQuantity(input.accelerationTorqueNm, "N*m"),
          ref: "drive.acceleration_torque",
        },
        { label: "T_L", value: makeQuantity(c.loadTorqueNm, "N*m") },
      ],
      outputs: [
        {
          label: "T1",
          value: makeQuantity(c.momentaryTorqueNm, "N*m"),
          ref: "drive.momentary_torque",
        },
      ],
      sources: RMS_SOURCE,
    };
  });

  const effectiveSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `effective-torque-${loadCase}`,
      title: `Effective (RMS) torque (${loadCase})`,
      methodId: "drive.effective_torque",
      expression:
        "Trms = sqrt((J_total*2*pi*gearRatio/lead)^2 * a_rms^2 + T_L^2)",
      inputs: [
        {
          label: "a_rms",
          value: input.rmsAcceleration,
          ref: "motion.profile.rms_acceleration",
        },
        { label: "T_L", value: makeQuantity(c.loadTorqueNm, "N*m") },
      ],
      outputs: [
        {
          label: "Trms",
          value: makeQuantity(c.effectiveTorqueNm, "N*m"),
          ref: "drive.effective_torque",
        },
      ],
      sources: RMS_SOURCE,
      notes: [
        "Valid under the closed-cycle assumption recorded in validity-and-assumptions below — this project's own derivation, not stated by any source (context/modules/drive-train/stage-2-contract.md 'Decisions' item 4).",
      ],
    };
  });

  const regenSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `regen-energy-${loadCase}`,
      title: `Regenerative energy released (${loadCase})`,
      methodId: "drive.regen_energy_released",
      expression: "E = J_total*(v/lead*2*pi*gearRatio)^2/2",
      inputs: [
        {
          label: "v",
          value: c.linearVelocity,
          ref: "motion.axis.case_linear_velocity",
        },
      ],
      outputs: [
        {
          label: "E_regen",
          value: makeQuantity(c.regenEnergyJ, "J"),
          ref: "drive.regen_energy_released",
        },
      ],
      sources: REGEN_SOURCE,
      notes: [
        "Assumes the case's own deceleration phase brings the axis from this case's own operating speed to rest, and that 100% of the released kinetic energy reaches the drive's own absorption path (no drive-electronics efficiency loss or DC-bus capacitor-absorption credit modeled).",
      ],
    };
  });

  return buildCalculationTrace([
    {
      node: "section",
      id: "inertia",
      title: "System inertia",
      children: [inertiaStep, accelTorqueStep],
    },
    {
      node: "section",
      id: "operating-speed",
      title: "Operating speed",
      children: speedSteps,
    },
    {
      node: "section",
      id: "load-torque",
      title: "Gearbox-derated load torque",
      children: loadTorqueSteps,
    },
    {
      node: "section",
      id: "momentary-torque",
      title: "Maximum momentary torque",
      children: momentarySteps,
    },
    {
      node: "section",
      id: "effective-torque",
      title: "Effective (RMS) torque",
      children: effectiveSteps,
    },
    {
      node: "section",
      id: "regenerative-energy",
      title: "Regenerative energy",
      children: regenSteps,
    },
    {
      node: "section",
      id: "gearbox-and-brake",
      title: "Gearbox and brake (reported)",
      children: [
        {
          node: "step",
          id: "gearbox-and-brake-report",
          title: "Gearbox ratio, efficiency, and holding brake rated torque",
          methodId: "drive.gearbox_brake_report",
          inputs: [],
          outputs: [
            {
              label: "gearRatio",
              value: input.gearRatio,
              ref: "screw.gear_ratio",
            },
            ...(input.gearboxEfficiency !== undefined
              ? [
                  {
                    label: "eta_g",
                    value: input.gearboxEfficiency,
                    ref: "drive.gearbox_efficiency",
                  },
                ]
              : []),
            ...(input.brakeRatedTorque !== undefined
              ? [
                  {
                    label: "T_brake",
                    value: input.brakeRatedTorque,
                    ref: "drive.brake_rated_torque",
                  },
                ]
              : []),
          ],
          notes: [
            "Gearbox backlash, transmission error, torsional rigidity, and mechanical life are not modeled in 0.1.0 — only qualitative catalog ranges by gearbox family exist (context/modules/drive-train/stage-1-spec.md item 7). Holding-brake rated torque is reported only, not evaluated — no source gives a standalone catalog-comparison formula (item 9).",
          ],
        },
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
          methodId: "drive.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "This module version (0.1.0) resolves only the normal and peak load cases, matching every other Milestone 4 module's own scope.",
            "The effective (RMS) torque formula relies on a closed-cycle assumption: motion.profile.rms_acceleration is sufficient only when total system inertia and the per-case load torque both stay constant across a cycle that returns to its starting velocity — this project's own derivation, not yet verified against a synthetic per-phase torque profile (context/modules/drive-train/stage-2-contract.md 'Decisions' item 4).",
            "Regenerative energy assumes 100% of the released kinetic energy reaches the drive's own absorption path and that the case's own deceleration phase brings the axis to rest — no drive-electronics efficiency loss or DC-bus capacitor-absorption credit is modeled.",
            `RMS-torque margin = ${input.rmsTorqueMargin.value}, peak-torque margin = ${input.peakTorqueMargin.value}, maximum inertia ratio = ${input.inertiaRatioMaximum.value} (all engineer-supplied, no built-in default) — context/modules/drive-train/stage-2-contract.md 'Decisions' item 3.`,
            "Drive/amplifier current and voltage compatibility are out of scope entirely — this project's unit registry has no electrical-current dimension yet.",
          ],
        },
      ],
    },
  ]);
}
