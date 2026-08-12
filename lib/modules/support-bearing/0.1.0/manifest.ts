// Manifest and ports for the support-bearing module (Unit 4.6, released).
//
// v0.1.0 scope: the `normal` and `peak` load cases only, matching
// `axis-load-cases 0.1.0`'s and `ball-screw 0.1.0`'s own scope restriction.
// Models one support bearing per calculation run (`bearing.location`
// selects `fixed` or `supported`) — see
// context/modules/support-bearing/stage-2-contract.md "Decisions" item 1.
// The axial-load-related ports (`*_thrust_force`,
// `dynamic_load_factor_y`, `static_load_factor_y`) are optional at the
// port level and only meaningful for a `fixed`-location calculation;
// `./input-schema.ts` requires them together when `bearing.location` is
// `"fixed"`.
//
// Released and registered 2026-08-12 as support-bearing@0.1.0
// (lib/modules/registry.generated.ts, validation/support-bearing/0.1.0.md).

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
  id: "support-bearing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.7.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.7.0",
  category: "bearing",
  tags: ["support-bearing", "bearing", "transmission"],
  // linear-axis@1's "linear-axis.bearing" role (Unit 4.8,
  // lib/workflows/linear-axis/1.0.0/definition.ts). Cardinality 1-2 there —
  // a fixed+supported arrangement needs two instances of this same role.
  workflowRoles: ["linear-axis.bearing"],
  validityEnvelopeSummary:
    "One ball-screw shaft support bearing at a time (fixed-side angular contact, or supported/floating-side deep-groove — bearing.location selects which), consuming the normal (steady) and peak load cases already resolved by axis-load-cases (holding and emergency_stop are not supported); two-point shaft support only; ball bearings only; axial load (fixed side only) reuses motion.axis.thrust_force directly; radial load is a new required engineer-supplied input (no upstream parameter cleanly supplies it); dynamic/static equivalent-load factors (X/Y/X0/Y0) are engineer-supplied catalog lookups; the static safety factor minimum is a required input with no built-in default; preload, bore diameter, and outside diameter are reported catalog values, not evaluated; no torsional-resonance check, no 3-point statically-indeterminate load derivation, no fit-tolerance-class verification; NTN's own speed correction factors (fL/fC) are not implemented — the catalog allowable speed is used uncorrected.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.thk.ball_screw_general_catalog@technico-mirror-2026-08-09",
    ),
    asSourceRevisionId("jp.ntn.rolling_bearings_handbook@cat-9012e"),
  ],
};

function perCaseInputPorts(
  loadCase: (typeof CASES)[number],
): ModuleInputPort[] {
  return [
    {
      key: `${loadCase}_actual_radial_load`,
      parameterId: asParameterId("bearing.actual_radial_load"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_thrust_force`,
      parameterId: asParameterId("motion.axis.thrust_force"),
      // Optional: only meaningful for bearing.location = "fixed"
      // (stage-2-contract.md "Decisions" item 3). ./input-schema.ts
      // requires it when location is "fixed".
      required: false,
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
      key: `${loadCase}_dynamic_equivalent_load`,
      parameterId: asParameterId("bearing.dynamic_equivalent_load"),
      loadCase,
    },
    {
      key: `${loadCase}_nominal_life`,
      parameterId: asParameterId("bearing.nominal_life"),
      loadCase,
    },
    {
      key: `${loadCase}_nominal_life_hours`,
      parameterId: asParameterId("bearing.nominal_life_hours"),
      loadCase,
    },
    {
      key: `${loadCase}_static_safety_factor`,
      parameterId: asParameterId("bearing.static_safety_factor"),
      loadCase,
    },
    {
      key: `${loadCase}_speed_safety_factor`,
      parameterId: asParameterId("bearing.speed_safety_factor"),
      loadCase,
    },
  ];
}

export const ports: ModulePorts = {
  inputs: [
    {
      key: "location",
      parameterId: asParameterId("bearing.location"),
      required: true,
    },
    {
      key: "lead",
      parameterId: asParameterId("screw.lead"),
      required: true,
    },
    {
      key: "dynamic_load_rating",
      parameterId: asParameterId("bearing.dynamic_load_rating"),
      required: true,
    },
    {
      key: "static_load_rating",
      parameterId: asParameterId("bearing.static_load_rating"),
      required: true,
    },
    {
      key: "allowable_speed",
      parameterId: asParameterId("bearing.allowable_speed"),
      required: true,
    },
    {
      key: "dynamic_load_factor_x",
      parameterId: asParameterId("bearing.dynamic_load_factor_x"),
      required: true,
    },
    {
      key: "dynamic_load_factor_y",
      parameterId: asParameterId("bearing.dynamic_load_factor_y"),
      // Optional: only meaningful for bearing.location = "fixed".
      required: false,
    },
    {
      key: "static_load_factor_x",
      parameterId: asParameterId("bearing.static_load_factor_x"),
      required: true,
    },
    {
      key: "static_load_factor_y",
      parameterId: asParameterId("bearing.static_load_factor_y"),
      // Optional: only meaningful for bearing.location = "fixed".
      required: false,
    },
    {
      key: "bore_diameter",
      parameterId: asParameterId("bearing.bore_diameter"),
      required: true,
    },
    {
      key: "outside_diameter",
      parameterId: asParameterId("bearing.outside_diameter"),
      required: true,
    },
    {
      key: "preload",
      parameterId: asParameterId("bearing.preload"),
      required: false,
    },
    {
      key: "static_safety_factor_minimum",
      parameterId: asParameterId("bearing.static_safety_factor_minimum"),
      required: true,
    },
    ...CASES.flatMap(perCaseInputPorts),
  ],
  outputs: [...CASES.flatMap(perCaseOutputPorts)],
};
