// Manifest and ports for the linear-guide module (Unit 4.4, Stage 3 draft).
//
// v0.1.0 scope: the `normal` and `peak` load cases only, matching
// `axis-load-cases 0.1.0`'s own scope restriction — the resultant force and
// moment this module consumes exist for no other case yet. See
// context/modules/linear-guide/stage-2-contract.md "Decisions" item 1.
//
// The applied-load ports are the two vector parameters registry 1.4.0 added
// specifically for this module (motion.axis.resultant_force /
// resultant_moment), not the axial motion.axis.thrust_force scalar ball-screw
// consumes: distributing a load across guide blocks needs the transverse
// components and the moment, which the scalar cannot carry
// (context/modules/linear-guide/stage-1-spec.md "A Real, Already-Documented
// Dependency Gap").
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
  id: "linear-guide",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.5.0, which released the guide.* group
  // this module's ports speak. Keep this literal — never import the mutable
  // current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.5.0",
  category: "guide",
  tags: ["linear-guide", "guideway", "rolling-guide"],
  // No linear-axis@1 workflow role vocabulary exists yet (Unit 4.8 is not
  // started); leave empty rather than invent one.
  workflowRoles: [],
  validityEnvelopeSummary:
    "One profile-rail linear guide on one linear axis in a fixed two-rail, two-blocks-per-rail arrangement (four load-bearing points), consuming the normal and peak resolved force/moment load cases already produced by axis-load-cases (holding and emergency_stop are not supported); horizontal or vertical installation only (overhung, wall-mount, and tilted installations are out of scope, and an inclined axis is rejected rather than approximated by either); ball-type rolling elements only (the e=3, 50 km life branch — a roller-type guide is rejected rather than silently given the ball exponent); equivalent load uses PMI's two-or-more-guideways form PE = |PR| + |PT|, so no moment rating is consumed and no separate moment term is added; the life load factor and the minimum static safety factor are required inputs with no built-in default (PMI and IKO publish differing guidance ranges for both); nominal life is reported per load case from that case's own equivalent load, not from a duty-cycle mean load; no preload-dependent stiffness modeling beyond recording the preload grade, no lubrication-regime, seal-wear, or rail-deflection modeling.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09",
    ),
    asSourceRevisionId("jp.iko.linear_way_catalog@1560e"),
  ],
};

function perCaseInputPorts(
  loadCase: (typeof CASES)[number],
): ModuleInputPort[] {
  return [
    {
      key: `${loadCase}_resultant_force`,
      parameterId: asParameterId("motion.axis.resultant_force"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_resultant_moment`,
      parameterId: asParameterId("motion.axis.resultant_moment"),
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
      key: `${loadCase}_equivalent_load`,
      parameterId: asParameterId("guide.equivalent_load"),
      loadCase,
    },
    {
      key: `${loadCase}_static_safety_factor`,
      parameterId: asParameterId("guide.static_safety_factor"),
      loadCase,
    },
    {
      key: `${loadCase}_nominal_life`,
      parameterId: asParameterId("guide.nominal_life"),
      loadCase,
    },
  ];
}

export const ports: ModulePorts = {
  inputs: [
    {
      key: "orientation",
      parameterId: asParameterId("motion.axis.orientation"),
      // Required, but NOT because it selects a formula — it does not. See
      // ./frame.ts: the block-load distribution is orientation-independent
      // once the load arrives resolved. It is required so an out-of-scope
      // `inclined` axis is rejected (./input-schema.ts) instead of being
      // quietly treated as one of the two supported installations, and so the
      // installation is recorded in the trace.
      required: true,
    },
    {
      key: "rail_spacing",
      parameterId: asParameterId("guide.rail_spacing"),
      required: true,
    },
    {
      key: "block_spacing",
      parameterId: asParameterId("guide.block_spacing"),
      required: true,
    },
    {
      key: "static_load_rating",
      parameterId: asParameterId("guide.static_load_rating"),
      required: true,
    },
    {
      key: "dynamic_load_rating",
      parameterId: asParameterId("guide.dynamic_load_rating"),
      required: true,
    },
    {
      key: "rolling_element_type",
      parameterId: asParameterId("guide.rolling_element_type"),
      required: true,
    },
    {
      key: "preload_grade",
      parameterId: asParameterId("guide.preload_grade"),
      required: true,
    },
    {
      key: "load_factor",
      parameterId: asParameterId("guide.load_factor"),
      required: true,
    },
    {
      key: "hardness_factor",
      parameterId: asParameterId("guide.hardness_factor"),
      // Optional: the registry's constant default (1.0) auto-fills an absent
      // value (lib/engine/module-sdk/execute.ts resolveModuleInput).
      required: false,
    },
    {
      key: "temperature_factor",
      parameterId: asParameterId("guide.temperature_factor"),
      required: false,
    },
    {
      key: "static_safety_factor_minimum",
      parameterId: asParameterId("guide.static_safety_factor_minimum"),
      required: true,
    },
    ...CASES.flatMap(perCaseInputPorts),
  ],
  outputs: [...CASES.flatMap(perCaseOutputPorts)],
};
