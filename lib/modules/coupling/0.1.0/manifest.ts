// Manifest and ports for the coupling module (Unit 4.5, released).
//
// v0.1.0 scope: the `normal` and `peak` load cases only, matching
// `axis-load-cases 0.1.0`'s and `ball-screw 0.1.0`'s own scope restriction.
// `normal` is checked as the steady-torque case, `peak` as the shock-torque
// case (context/modules/coupling/stage-2-contract.md "Decisions" item 4) —
// a documented adaptation, not a perfect conceptual match to KTR's/R+W's own
// "motor starting torque" concept (see manifest note on `screw.drive_torque`
// reuse and stage-2-contract.md "Decisions" item 4).
//
// Released and registered 2026-08-12 as coupling@0.1.0
// (lib/modules/registry.generated.ts, validation/coupling/0.1.0.md).

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
  id: "coupling",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.6.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.6.0",
  category: "coupling",
  tags: ["coupling", "transmission"],
  // linear-axis@1's "linear-axis.coupling" role (Unit 4.8,
  // lib/workflows/linear-axis/1.0.0/definition.ts). Cardinality 0-1 there,
  // resolved 2026-08-10: the founder confirmed direct-drive axes are a real
  // configuration, so the role stays optional
  // (context/adr/0007-workflow-definition-contract.md "Consequences").
  workflowRoles: ["linear-axis.coupling"],
  validityEnvelopeSummary:
    "One coupling connecting a ball screw's own drive shaft to its upstream driving shaft, consuming the normal (steady) and peak (shock) load cases already resolved by ball-screw (holding and emergency_stop are not supported); torque capacity checked with one consolidated, required, no-default service factor (KTR's and R+W's own factor tables disagree); operating rotational speed derived from motion.axis.case_linear_velocity via screw.lead and screw.gear_ratio, not a released screw.* speed port; misalignment and bore compatibility are simple bound checks against catalog data; torsional stiffness and moment of inertia are reported, not evaluated — no resonant-frequency or torsional-vibration check (no released motor/load inertia parameter exists yet).",
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.ktr.coupling_selection_operating_factors@web-2026-08-09",
    ),
    asSourceRevisionId(
      "us.rw_america.coupling_sizing_selection@web-2026-08-09",
    ),
    asSourceRevisionId("us.ktr.coupling_selection_din740_part2@web-2026-08-10"),
    asSourceRevisionId("jp.nbk.coupling_catalog@orim-vexta-1908ov78"),
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
      key: `${loadCase}_torque_safety_factor`,
      parameterId: asParameterId("coupling.torque_safety_factor"),
      loadCase,
    },
    {
      key: `${loadCase}_speed_safety_factor`,
      parameterId: asParameterId("coupling.speed_safety_factor"),
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
      // resolveModuleInput), the same treatment ball-screw's own reuse of
      // this parameter already gets.
      required: false,
    },
    {
      key: "rated_torque",
      parameterId: asParameterId("coupling.rated_torque"),
      required: true,
    },
    {
      key: "max_torque",
      parameterId: asParameterId("coupling.max_torque"),
      required: true,
    },
    {
      key: "allowable_speed",
      parameterId: asParameterId("coupling.allowable_speed"),
      required: true,
    },
    {
      key: "torsional_stiffness",
      parameterId: asParameterId("coupling.torsional_stiffness"),
      required: true,
    },
    {
      key: "moment_of_inertia",
      parameterId: asParameterId("coupling.moment_of_inertia"),
      required: true,
    },
    {
      key: "driving_bore_min",
      parameterId: asParameterId("coupling.driving_bore_min"),
      required: true,
    },
    {
      key: "driving_bore_max",
      parameterId: asParameterId("coupling.driving_bore_max"),
      required: true,
    },
    {
      key: "driven_bore_min",
      parameterId: asParameterId("coupling.driven_bore_min"),
      required: true,
    },
    {
      key: "driven_bore_max",
      parameterId: asParameterId("coupling.driven_bore_max"),
      required: true,
    },
    {
      key: "allowable_parallel_misalignment",
      parameterId: asParameterId("coupling.allowable_parallel_misalignment"),
      required: true,
    },
    {
      key: "allowable_angular_misalignment",
      parameterId: asParameterId("coupling.allowable_angular_misalignment"),
      required: true,
    },
    {
      key: "allowable_axial_misalignment",
      parameterId: asParameterId("coupling.allowable_axial_misalignment"),
      required: true,
    },
    {
      key: "actual_parallel_misalignment",
      parameterId: asParameterId("coupling.actual_parallel_misalignment"),
      required: true,
    },
    {
      key: "actual_angular_misalignment",
      parameterId: asParameterId("coupling.actual_angular_misalignment"),
      required: true,
    },
    {
      key: "actual_axial_misalignment",
      parameterId: asParameterId("coupling.actual_axial_misalignment"),
      required: true,
    },
    {
      key: "driving_shaft_diameter",
      parameterId: asParameterId("coupling.driving_shaft_diameter"),
      required: true,
    },
    {
      key: "driven_shaft_diameter",
      parameterId: asParameterId("coupling.driven_shaft_diameter"),
      required: true,
    },
    {
      key: "service_factor",
      parameterId: asParameterId("coupling.service_factor"),
      required: true,
    },
    ...CASES.flatMap(perCaseInputPorts),
  ],
  outputs: [...CASES.flatMap(perCaseOutputPorts)],
};
