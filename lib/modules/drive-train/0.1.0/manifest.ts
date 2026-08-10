// Manifest and ports for the servo drive-train module (Unit 4.7, Stage 3
// draft).
//
// v0.1.0 scope: the `normal` and `peak` load cases only, matching every
// other Milestone 4 module's own scope restriction. Sizes one candidate
// servo motor (plus an optional gearbox, already modeled via
// screw.gear_ratio; an optional drive's own regenerative-energy absorption
// capacity; and an optional holding brake's own rated torque, reported
// only). `drive.reflected_load_inertia` is a required engineer-supplied
// input, not a computed value -- see
// context/modules/drive-train/stage-2-contract.md "Stage 3 corrections".
//
// This package is intentionally NOT registered: this directory has no
// `index.ts`, so `npm run registry:generate` cannot discover it (see
// ./README.md). Registration remains gated behind Unit 4.1's Definition of
// Done regardless (context/implementation-map.md Milestone 4 header).

import {
  asParameterId,
  type LoadCaseCategory,
  type ModuleInputPort,
  type ModuleOutputPort,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

const CASES = ["normal", "peak"] as const satisfies readonly LoadCaseCategory[];

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "drive-train",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.8.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.8.0",
  category: "drive",
  tags: ["drive-train", "servo-motor", "gearbox"],
  // linear-axis@1's "linear-axis.drive" role (Unit 4.8,
  // lib/workflows/linear-axis/1.0.0/definition.ts).
  workflowRoles: ["linear-axis.drive"],
  validityEnvelopeSummary:
    "One candidate servo motor at a time, consuming the normal and peak load cases already resolved by axis-load-cases/ball-screw (holding and emergency_stop are not supported); RMS torque, peak (maximum momentary) torque, inertia ratio, and rotational speed are evaluated checks, each with a required engineer-supplied margin/limit and no built-in default (multi-way sourced disagreement on all three); regenerative energy is an evaluated check under a stated '100% efficient absorption' simplifying assumption, only when a drive's own absorption capacity is supplied; gearbox ratio reuses screw.gear_ratio directly and gearbox efficiency is a new, required-when-a-gearbox-is-declared input distinct from the ball screw's own internal efficiency; drive.reflected_load_inertia is a required engineer-supplied input, since no released upstream parameter derives it; holding-brake rated torque and gearbox backlash/life are reported catalog values, not evaluated; drive/amplifier current and voltage compatibility are out of scope entirely (no electrical-current dimension in the unit registry yet); the RMS-torque formula relies on a closed-cycle assumption (motion.profile.rms_acceleration is sufficient only when total system inertia and per-case load torque both stay constant across a cycle that returns to its starting velocity) recorded on every calculation, not yet verified against a synthetic per-phase torque profile.",
  sourceRevisionIds: [
    asSourceRevisionId("jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"),
    asSourceRevisionId(
      "us.hmk.servo_motor_amplifier_sizing_guide@edition-2-0802",
    ),
    asSourceRevisionId("us.voss.comprehensible_guide_servo_motor_sizing@2007"),
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_basics_rms_torque@web-2026-08-10",
    ),
    asSourceRevisionId(
      "us.celera_motion.shunt_resistor_regenerative_braking@web-2026-08-10",
    ),
    asSourceRevisionId(
      "jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10",
    ),
  ],
};

function perCaseInputPorts(
  loadCase: (typeof CASES)[number],
): ModuleInputPort[] {
  return [
    {
      key: `${loadCase}_drive_torque`,
      parameterId: asParameterId("screw.drive_torque"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_linear_velocity`,
      parameterId: asParameterId("motion.axis.case_linear_velocity"),
      required: true,
      loadCase,
    },
  ];
}

function perCaseOutputPorts(
  loadCase: (typeof CASES)[number],
): ModuleOutputPort[] {
  return [
    {
      key: `${loadCase}_operating_speed`,
      parameterId: asParameterId("drive.operating_speed"),
      loadCase,
    },
    {
      key: `${loadCase}_momentary_torque`,
      parameterId: asParameterId("drive.momentary_torque"),
      loadCase,
    },
    {
      key: `${loadCase}_effective_torque`,
      parameterId: asParameterId("drive.effective_torque"),
      loadCase,
    },
    {
      key: `${loadCase}_regen_energy_released`,
      parameterId: asParameterId("drive.regen_energy_released"),
      loadCase,
    },
  ];
}

export const ports: ModulePorts = {
  inputs: [
    {
      key: "lead",
      parameterId: asParameterId("screw.lead"),
      required: true,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("screw.gear_ratio"),
      // Optional: the registry's constant default (1, direct-connected)
      // auto-fills an absent value (lib/engine/module-sdk/execute.ts
      // resolveModuleInput), the same treatment ball-screw's and coupling's
      // own reuse of this parameter already gets.
      required: false,
    },
    {
      key: "gearbox_efficiency",
      parameterId: asParameterId("drive.gearbox_efficiency"),
      // Optional at the port level; ./input-schema.ts requires it whenever
      // gear_ratio != 1 (stage-2-contract.md "Decisions" item 5).
      required: false,
    },
    {
      key: "motor_rated_torque",
      parameterId: asParameterId("drive.motor_rated_torque"),
      required: true,
    },
    {
      key: "motor_peak_torque",
      parameterId: asParameterId("drive.motor_peak_torque"),
      required: true,
    },
    {
      key: "motor_rated_speed",
      parameterId: asParameterId("drive.motor_rated_speed"),
      required: true,
    },
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId("drive.motor_rotor_inertia"),
      required: true,
    },
    {
      key: "reflected_load_inertia",
      parameterId: asParameterId("drive.reflected_load_inertia"),
      required: true,
    },
    {
      key: "rms_torque_margin",
      parameterId: asParameterId("drive.rms_torque_margin"),
      required: true,
    },
    {
      key: "peak_torque_margin",
      parameterId: asParameterId("drive.peak_torque_margin"),
      required: true,
    },
    {
      key: "inertia_ratio_maximum",
      parameterId: asParameterId("drive.inertia_ratio_maximum"),
      required: true,
    },
    {
      key: "regen_absorption_capacity",
      parameterId: asParameterId("drive.regen_absorption_capacity"),
      // Optional: when absent, the regenerative-energy check reports
      // not_applicable (stage-2-contract.md "Decisions" item 6).
      required: false,
    },
    {
      key: "brake_rated_torque",
      parameterId: asParameterId("drive.brake_rated_torque"),
      // Optional: reported only, never evaluated (stage-1-spec.md item 9).
      required: false,
    },
    {
      key: "peak_acceleration",
      parameterId: asParameterId("motion.profile.peak_acceleration"),
      required: true,
    },
    {
      key: "peak_deceleration",
      parameterId: asParameterId("motion.profile.peak_deceleration"),
      required: true,
    },
    {
      key: "rms_acceleration",
      parameterId: asParameterId("motion.profile.rms_acceleration"),
      required: true,
    },
    ...CASES.flatMap(perCaseInputPorts),
  ],
  outputs: [
    {
      key: "total_system_inertia",
      parameterId: asParameterId("drive.total_system_inertia"),
    },
    {
      key: "inertia_ratio",
      parameterId: asParameterId("drive.inertia_ratio"),
    },
    {
      key: "acceleration_torque",
      parameterId: asParameterId("drive.acceleration_torque"),
    },
    ...CASES.flatMap(perCaseOutputPorts),
  ],
};
