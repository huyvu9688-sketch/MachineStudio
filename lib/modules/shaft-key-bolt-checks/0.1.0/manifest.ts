// Manifest and ports for the shaft-key-bolt-checks module (Unit 7.5, Stage 3
// draft). Not registered yet -- Stages 4-6 remain.
//
// v0.1.0 scope, founder-directed 2026-08-31: every instance supplies the
// full shaft, key, and bolt (preload + tensile-capacity) input set together
// and every check always computes -- not the three (or two) independently
// optional groupings stage-1-spec.md's own "each usable on its own" framing
// first suggested. Stage 3 found that the module SDK requires every
// declared output port to be produced by every compute() call
// (lib/engine/module-sdk/execute.ts's own resolveModuleInput/executeModule
// -- "did not produce output" is a hard failure), so a port whose formula
// has no defined value without an optional input cannot be made "sometimes
// present" within one module version; making shaft, key, and bolt each
// independently optional would require either splitting into separate
// modules or reporting a placeholder number for an undefined result.
// Presented as a choice, the founder chose the simpler, single-module path
// for 0.1.0: require the full set together, and defer true per-check
// independence to a later version (stage-2-contract.md "Decisions" item 9).
//
// Joint separation and the shear/bearing bolt path stay unconsumed in
// 0.1.0 for the same underlying SDK reason (their own governing inputs
// have no constant "off" value that keeps their formula defined) --
// bolt.joint_stiffness_ratio remains genuinely optional, feeding only the
// tensile check's own applied-load share (defaults to the conservative
// C = 1 when omitted); it does not gate a separate output port.

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
  id: "shaft-key-bolt-checks",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.21.0. Keep this literal -- never
  // import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.21.0",
  category: "mechanical-checks",
  tags: ["shaft", "key", "bolt", "fastener", "static-strength"],
  // Not scoped to any one mechanism family: no workflow role (unlike every
  // module released so far) -- torque/moment inputs are generic, plain
  // required engineer entries, not a hard dependency on any one upstream
  // mechanism module (stage-2-contract.md "Decisions" item 5). shaft.
  // applied_torque shares screw.drive_torque's own unit/qualifiers/load
  // cases but is NOT a graph-level-compatible link source today -- the two
  // are distinct registered parameter IDs and this project has no populated
  // ApprovedParameterMapping mechanism yet (see stage-2-contract.md
  // "Decisions" item 5's own Stage 5 correction and
  // ./cross-module-links.test.ts).
  workflowRoles: [],
  validityEnvelopeSummary:
    "Every instance supplies the full shaft, key, and bolt input set together (founder-directed 0.1.0 simplification, stage-2-contract.md 'Decisions' item 9): combined torque/bending Tresca stress on a candidate shaft diameter (static/yield-based only, no fatigue), parallel/sunk key shear and bearing stress (h/2 bearing-depth approximation), and bolted-joint installation-torque preload and tensile-capacity margin against proof strength. Joint separation and the shear/bearing bolt path are registered but not yet wired as ports. No fatigue, no multi-bolt-pattern eccentric-load distribution, no combined tension+shear bolt interaction, no catalog matching. Normal/peak load cases only.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.engineeringlibrary.afdl_stress_analysis_manual_shafts@web-2026-08-31",
    ),
    asSourceRevisionId("us.roymech.shaft_design@web-2026-08-31"),
    asSourceRevisionId("jp.miki_pulley.parallel_key_jis_b1301@web-2026-08-31"),
    asSourceRevisionId("us.roymech.key_and_spline_strength@web-2026-08-31"),
    asSourceRevisionId(
      "jp.instant_engineer.key_shear_bearing_stress@web-2026-08-31",
    ),
    asSourceRevisionId("us.fastenal.torque_tension_iso898_1@web-2026-08-31"),
    asSourceRevisionId("us.roymech.bolt_preload_calculation@web-2026-08-31"),
    asSourceRevisionId("us.mechanicalc.bolted_joint_analysis@web-2026-08-31"),
    asSourceRevisionId(
      "us.triangle_fastener.stress_area_asme_b1_1@web-2026-08-31",
    ),
    asSourceRevisionId("us.southwest_bolt.sae_j429_grades@web-2026-08-31"),
    asSourceRevisionId(
      "jp.nbk_america.technical_29_property_classes@web-2026-08-31",
    ),
    asSourceRevisionId("us.up_edu.me401_fastener_notes@web-2026-08-31"),
    asSourceRevisionId("us.roymech.bolted_joint_shear_bearing@web-2026-08-31"),
    asSourceRevisionId("us.roymech.joint_stiffness@web-2026-08-31"),
  ],
};

function shaftKeyInputPorts(): ModuleInputPort[] {
  const perCase = CASES.flatMap((loadCase) => [
    {
      key: `${loadCase}_shaft_applied_torque`,
      parameterId: asParameterId("shaft.applied_torque"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_shaft_applied_bending_moment`,
      parameterId: asParameterId("shaft.applied_bending_moment"),
      required: true,
      loadCase,
    },
  ]);
  return [
    {
      key: "shaft_diameter",
      parameterId: asParameterId("shaft.diameter"),
      required: true,
    },
    {
      // Optional at the port level: the registry's own constant default
      // (0, solid shaft) auto-fills an absent value before compute() is
      // ever called -- same pattern coupling's own gear_ratio reuse relies
      // on.
      key: "shaft_bore_diameter",
      parameterId: asParameterId("shaft.bore_diameter"),
      required: false,
    },
    {
      key: "shaft_material_yield_strength",
      parameterId: asParameterId("shaft.material_yield_strength"),
      required: true,
    },
    {
      key: "shaft_torque_service_factor",
      parameterId: asParameterId("shaft.torque_service_factor"),
      required: true,
    },
    {
      key: "shaft_bending_service_factor",
      parameterId: asParameterId("shaft.bending_service_factor"),
      required: true,
    },
    {
      key: "shaft_safety_factor_minimum",
      parameterId: asParameterId("shaft.safety_factor_minimum"),
      required: true,
    },
    {
      key: "key_width",
      parameterId: asParameterId("key.width"),
      required: true,
    },
    {
      key: "key_height",
      parameterId: asParameterId("key.height"),
      required: true,
    },
    {
      key: "key_length",
      parameterId: asParameterId("key.length"),
      required: true,
    },
    {
      key: "key_material_yield_strength",
      parameterId: asParameterId("key.material_yield_strength"),
      required: true,
    },
    {
      key: "key_safety_factor_minimum",
      parameterId: asParameterId("key.safety_factor_minimum"),
      required: true,
    },
    ...perCase,
  ];
}

function shaftKeyOutputPorts(): ModuleOutputPort[] {
  return CASES.flatMap((loadCase) => [
    {
      key: `${loadCase}_shaft_combined_stress`,
      parameterId: asParameterId("shaft.combined_stress"),
      loadCase,
    },
    {
      key: `${loadCase}_shaft_safety_factor`,
      parameterId: asParameterId("shaft.safety_factor"),
      loadCase,
    },
    {
      key: `${loadCase}_key_shear_stress`,
      parameterId: asParameterId("key.shear_stress"),
      loadCase,
    },
    {
      key: `${loadCase}_key_bearing_stress`,
      parameterId: asParameterId("key.bearing_stress"),
      loadCase,
    },
    {
      key: `${loadCase}_key_shear_safety_factor`,
      parameterId: asParameterId("key.shear_safety_factor"),
      loadCase,
    },
    {
      key: `${loadCase}_key_bearing_safety_factor`,
      parameterId: asParameterId("key.bearing_safety_factor"),
      loadCase,
    },
  ]);
}

function boltInputPorts(): ModuleInputPort[] {
  const perCase = CASES.map((loadCase) => ({
    key: `${loadCase}_bolt_external_tensile_load`,
    parameterId: asParameterId("bolt.external_tensile_load"),
    // Optional: the registry's own constant default (0) auto-fills an
    // absent value -- meaning "no external tension beyond preload", not an
    // unset requirement.
    required: false,
    loadCase,
  }));
  return [
    {
      key: "bolt_thread_standard",
      parameterId: asParameterId("bolt.thread_standard"),
      required: true,
    },
    {
      key: "bolt_nominal_diameter",
      parameterId: asParameterId("bolt.nominal_diameter"),
      required: true,
    },
    {
      key: "bolt_thread_pitch",
      parameterId: asParameterId("bolt.thread_pitch"),
      required: true,
    },
    {
      key: "bolt_proof_strength",
      parameterId: asParameterId("bolt.proof_strength"),
      required: true,
    },
    {
      key: "bolt_k_factor",
      parameterId: asParameterId("bolt.k_factor"),
      required: true,
    },
    {
      key: "bolt_installation_torque",
      parameterId: asParameterId("bolt.installation_torque"),
      required: true,
    },
    {
      key: "bolt_safety_factor_minimum",
      parameterId: asParameterId("bolt.safety_factor_minimum"),
      required: true,
    },
    {
      // Optional: feeds only the tensile check's own applied-load share
      // (defaults to the conservative C = 1 when omitted). Joint
      // separation itself is not wired as a port in 0.1.0 -- see this
      // file's own header note and stage-2-contract.md "Decisions" item 9.
      key: "bolt_joint_stiffness_ratio",
      parameterId: asParameterId("bolt.joint_stiffness_ratio"),
      required: false,
    },
    ...perCase,
  ];
}

function boltOutputPorts(): ModuleOutputPort[] {
  return [
    {
      key: "bolt_preload",
      parameterId: asParameterId("bolt.preload"),
    },
    ...CASES.map((loadCase) => ({
      key: `${loadCase}_bolt_tensile_safety_factor`,
      parameterId: asParameterId("bolt.tensile_safety_factor"),
      loadCase,
    })),
  ];
}

export const ports: ModulePorts = {
  inputs: [...shaftKeyInputPorts(), ...boltInputPorts()],
  outputs: [...shaftKeyOutputPorts(), ...boltOutputPorts()],
};
