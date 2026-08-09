// Calculation trace for the coupling module. Follows the trace contract
// proposed in context/modules/coupling/stage-1-spec.md "Trace Contract
// (Proposed)": per-case applied torque and operating speed, torque-capacity
// and speed checks, misalignment, bore compatibility, reported torsional
// properties, and a closing validity-and-assumptions section. Cites the
// actual formula each step applies, distinguishing elementary geometry/
// arithmetic (no citation) from a manufacturer-specific method (cited) — the
// same discipline every other module in this project already established.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const KTR_TORQUE_CAPACITY = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.ktr.coupling_selection_operating_factors@web-2026-08-09",
    ),
    clause: "'Coupling selection', item 1.1 (Loading by rated torque)",
    label: "T_KN >= T_N * S_B * S_t * S_R",
  },
];

const OPERATING_SPEED_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.ktr.coupling_selection_operating_factors@web-2026-08-09",
    ),
    clause: "screw.lead / screw.gear_ratio reuse, not a KTR/R+W formula",
    label: "n_driving = (v / lead) * 2*pi * gearRatio",
  },
];

export type CouplingCase = "normal" | "peak";

export interface TraceCaseInput {
  readonly driveTorque: Quantity;
  readonly linearVelocity: Quantity;
  readonly rotationalSpeedRadPerS: number;
  readonly scaledRequiredTorqueNm: number;
  readonly capacityTorqueNm: number;
  readonly torqueSafetyFactor: number;
  readonly speedSafetyFactor: number;
}

export interface TraceInput {
  readonly lead: Quantity;
  readonly gearRatio: Quantity;
  readonly ratedTorque: Quantity;
  readonly maxTorque: Quantity;
  readonly allowableSpeed: Quantity;
  readonly torsionalStiffness: Quantity;
  readonly momentOfInertia: Quantity;
  readonly drivingBoreMin: Quantity;
  readonly drivingBoreMax: Quantity;
  readonly drivenBoreMin: Quantity;
  readonly drivenBoreMax: Quantity;
  readonly allowableParallelMisalignment: Quantity;
  readonly allowableAngularMisalignment: Quantity;
  readonly allowableAxialMisalignment: Quantity;
  readonly actualParallelMisalignment: Quantity;
  readonly actualAngularMisalignment: Quantity;
  readonly actualAxialMisalignment: Quantity;
  readonly drivingShaftDiameter: Quantity;
  readonly drivenShaftDiameter: Quantity;
  readonly serviceFactor: Quantity;
  readonly cases: Readonly<Record<CouplingCase, TraceCaseInput>>;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const CASES: readonly CouplingCase[] = ["normal", "peak"];

  const speedSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `operating-speed-${loadCase}`,
      title: `Driving-shaft operating speed (${loadCase})`,
      methodId: "coupling.operating_speed",
      expression: "n_driving = (v / lead) * 2*pi * gearRatio",
      inputs: [
        {
          label: "v",
          value: c.linearVelocity,
          ref: "motion.axis.case_linear_velocity",
        },
        { label: "lead", value: input.lead, ref: "screw.lead" },
        { label: "gearRatio", value: input.gearRatio, ref: "screw.gear_ratio" },
      ],
      outputs: [
        {
          label: "n_driving",
          value: makeQuantity(c.rotationalSpeedRadPerS, "rad/s"),
        },
      ],
      sources: OPERATING_SPEED_SOURCE,
      notes: [
        "Derived locally from already-released ports, not a screw.* speed port — context/modules/coupling/stage-2-contract.md 'Decisions' item 1.",
      ],
    };
  });

  const torqueSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    const capacityRef =
      loadCase === "normal" ? "coupling.rated_torque" : "coupling.max_torque";
    return {
      node: "step" as const,
      id: `torque-safety-${loadCase}`,
      title: `Torque safety factor (${loadCase})`,
      methodId: "coupling.torque_safety_factor",
      expression: "fs_T = T_capacity / (|T_required| * S)",
      inputs: [
        {
          label: "T_required",
          value: c.driveTorque,
          ref: "screw.drive_torque",
        },
        {
          label: "S",
          value: input.serviceFactor,
          ref: "coupling.service_factor",
        },
        {
          label: "T_capacity",
          value: makeQuantity(c.capacityTorqueNm, "N*m"),
          ref: capacityRef,
        },
      ],
      outputs: [
        {
          label: "fs_T",
          value: makeQuantity(c.torqueSafetyFactor, "ratio"),
          ref: "coupling.torque_safety_factor",
        },
      ],
      sources: KTR_TORQUE_CAPACITY,
      notes: [
        loadCase === "normal"
          ? "Steady-state check: capacity is coupling.rated_torque (KTR's T_KN)."
          : "Shock check: capacity is coupling.max_torque (KTR's T_Kmax); this module reuses the same required-torque-times-service-factor form as the steady check rather than KTR's own summed (T_N + T_S) form or R+W's disengagement-multiplier form — context/modules/coupling/stage-2-contract.md 'Decisions' item 3.",
        `${loadCase} case maps onto KTR's/R+W's own torque concept as a documented adaptation, not a clean match — context/modules/coupling/stage-2-contract.md 'Decisions' item 4.`,
      ],
    };
  });

  const speedCheckSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `speed-safety-${loadCase}`,
      title: `Speed safety factor (${loadCase})`,
      methodId: "coupling.speed_safety_factor",
      expression: "fs_n = n_allowable / n_driving",
      inputs: [
        {
          label: "n_allowable",
          value: input.allowableSpeed,
          ref: "coupling.allowable_speed",
        },
        {
          label: "n_driving",
          value: makeQuantity(c.rotationalSpeedRadPerS, "rad/s"),
        },
      ],
      outputs: [
        {
          label: "fs_n",
          value: makeQuantity(c.speedSafetyFactor, "ratio"),
          ref: "coupling.speed_safety_factor",
        },
      ],
    };
  });

  const misalignmentSteps = [
    {
      axis: "parallel",
      actual: input.actualParallelMisalignment,
      allowable: input.allowableParallelMisalignment,
      actualRef: "coupling.actual_parallel_misalignment",
      allowableRef: "coupling.allowable_parallel_misalignment",
    },
    {
      axis: "angular",
      actual: input.actualAngularMisalignment,
      allowable: input.allowableAngularMisalignment,
      actualRef: "coupling.actual_angular_misalignment",
      allowableRef: "coupling.allowable_angular_misalignment",
    },
    {
      axis: "axial",
      actual: input.actualAxialMisalignment,
      allowable: input.allowableAxialMisalignment,
      actualRef: "coupling.actual_axial_misalignment",
      allowableRef: "coupling.allowable_axial_misalignment",
    },
  ].map((m) => ({
    node: "step" as const,
    id: `misalignment-${m.axis}`,
    title: `${m.axis[0].toUpperCase()}${m.axis.slice(1)} misalignment check`,
    methodId: `coupling.misalignment_${m.axis}`,
    expression: "actual <= allowable",
    inputs: [
      { label: "actual", value: m.actual, ref: m.actualRef },
      { label: "allowable", value: m.allowable, ref: m.allowableRef },
    ],
    outputs: [],
  }));

  const boreSteps = [
    {
      side: "driving",
      actual: input.drivingShaftDiameter,
      min: input.drivingBoreMin,
      max: input.drivingBoreMax,
      actualRef: "coupling.driving_shaft_diameter",
      minRef: "coupling.driving_bore_min",
      maxRef: "coupling.driving_bore_max",
    },
    {
      side: "driven",
      actual: input.drivenShaftDiameter,
      min: input.drivenBoreMin,
      max: input.drivenBoreMax,
      actualRef: "coupling.driven_shaft_diameter",
      minRef: "coupling.driven_bore_min",
      maxRef: "coupling.driven_bore_max",
    },
  ].map((b) => ({
    node: "step" as const,
    id: `bore-compatibility-${b.side}`,
    title: `${b.side[0].toUpperCase()}${b.side.slice(1)}-side bore compatibility`,
    methodId: `coupling.bore_compatibility_${b.side}`,
    expression: "min <= actual <= max",
    inputs: [
      { label: "min", value: b.min, ref: b.minRef },
      { label: "actual", value: b.actual, ref: b.actualRef },
      { label: "max", value: b.max, ref: b.maxRef },
    ],
    outputs: [],
  }));

  return buildCalculationTrace([
    {
      node: "section",
      id: "operating-speed",
      title: "Operating speed",
      children: speedSteps,
    },
    {
      node: "section",
      id: "torque-capacity",
      title: "Torque capacity",
      children: torqueSteps,
    },
    {
      node: "section",
      id: "speed-limit",
      title: "Speed limit",
      children: speedCheckSteps,
    },
    {
      node: "section",
      id: "misalignment",
      title: "Misalignment",
      children: misalignmentSteps,
    },
    {
      node: "section",
      id: "bore-compatibility",
      title: "Bore compatibility",
      children: boreSteps,
    },
    {
      node: "section",
      id: "torsional-properties",
      title: "Torsional properties (reported)",
      children: [
        {
          node: "step",
          id: "torsional-properties-report",
          title: "Torsional stiffness and moment of inertia",
          methodId: "coupling.torsional_properties",
          inputs: [],
          outputs: [
            {
              label: "C_T",
              value: input.torsionalStiffness,
              ref: "coupling.torsional_stiffness",
            },
            {
              label: "J_C",
              value: input.momentOfInertia,
              ref: "coupling.moment_of_inertia",
            },
          ],
          notes: [
            "Catalog values, reported rather than evaluated pass/fail: R+W's own torsional-resonant-frequency check (context/modules/coupling/stage-1-spec.md item 3) needs a motor/load inertia input this project does not release yet.",
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
          methodId: "coupling.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "This module version (0.1.0) resolves only the normal and peak load cases, matching axis-load-cases' and ball-screw's own scope.",
            "One coupling connecting a ball screw's own drive shaft to its upstream driving shaft — not a multi-coupling driveline.",
            "No torsional-resonance or periodic-vibration check; torsional stiffness and moment of inertia are reported only.",
            `Service factor S = ${input.serviceFactor.value} (engineer-supplied, no built-in default) applied identically to both the steady and shock torque checks — a documented simplification (context/modules/coupling/stage-2-contract.md 'Decisions' item 5).`,
          ],
        },
      ],
    },
  ]);
}
