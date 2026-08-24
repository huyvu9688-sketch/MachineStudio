// Manifest and ports for the ball-screw module (Unit 4.3, released).
//
// v0.1.0 scope: the `normal` and `peak` load cases only, matching
// `axis-load-cases 0.1.0`'s own scope restriction — there is no supported
// upstream `holding`/`emergency_stop` thrust force to consume yet. See
// context/modules/ball-screw/stage-2-contract.md "Status".
//
// Released and registered 2026-08-12 as ball-screw@0.1.0
// (lib/modules/registry.generated.ts, validation/ball-screw/0.1.0.md).
//
// v0.1.1 (this version) is a formula-correctness patch, ports and scope
// otherwise unchanged from 0.1.0: `resolveDriveTorque` (math.ts) now takes
// the magnitude of the computed torque rather than letting a signed
// (assisting-load) `axialForceN` produce a `screw.drive_torque` output that
// violated that parameter's own `range: { min: 0 }` — see validation.ts
// "deviations" and math.ts's own doc comment.

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
  id: "ball-screw",
  version: "0.1.1",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.3.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.3.0",
  category: "screw",
  tags: ["ball-screw", "transmission", "screw"],
  // linear-axis@1's "linear-axis.screw" role (Unit 4.8,
  // lib/workflows/linear-axis/1.0.0/definition.ts).
  workflowRoles: ["linear-axis.screw"],
  validityEnvelopeSummary:
    "One straight ball-screw shaft on one linear axis, consuming the normal and peak axial load cases already resolved by axis-load-cases (holding and emergency_stop are not supported); rotating-screw / translating-nut arrangement only; one of four end-support arrangements (fixed-fixed, fixed-supported, supported-supported, fixed-free); buckling and critical-speed formulas use the screw's minor (root) diameter; the dynamic load rating must be on a revolutions basis (a distance-basis rating is rejected rather than silently misapplied); the static safety factor minimum and the buckling safety margin are required inputs with no built-in default (published guidance disagrees on both); no preload-dependent stiffness modeling beyond the internal-friction/efficiency terms, no thermal derating, no structural compliance, backlash, or lubrication-regime modeling.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    asSourceRevisionId("us.steinmeyer.ball_screw_technology@web-2026-08-08"),
    asSourceRevisionId("us.rockford_ball_screw.how_to_size@update-2018"),
    asSourceRevisionId("us.wy_ball_screw.understanding_load@web-2026-08-08"),
  ],
};

function perCaseInputPorts(
  loadCase: (typeof CASES)[number],
): ModuleInputPort[] {
  return [
    {
      key: `${loadCase}_thrust_force`,
      parameterId: asParameterId("motion.axis.thrust_force"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_time_fraction`,
      parameterId: asParameterId("motion.axis.case_time_fraction"),
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
      key: `${loadCase}_drive_torque`,
      parameterId: asParameterId("screw.drive_torque"),
      loadCase,
    },
    {
      key: `${loadCase}_static_safety_factor`,
      parameterId: asParameterId("screw.static_safety_factor"),
      loadCase,
    },
  ];
}

export const ports: ModulePorts = {
  inputs: [
    {
      key: "minor_diameter",
      parameterId: asParameterId("screw.minor_diameter"),
      required: true,
    },
    {
      key: "lead",
      parameterId: asParameterId("screw.lead"),
      required: true,
    },
    {
      key: "unsupported_length",
      parameterId: asParameterId("screw.unsupported_length"),
      required: true,
    },
    {
      key: "end_support_arrangement",
      parameterId: asParameterId("screw.end_support_arrangement"),
      required: true,
    },
    {
      key: "dynamic_load_rating",
      parameterId: asParameterId("screw.dynamic_load_rating"),
      required: true,
    },
    {
      key: "dynamic_load_rating_basis",
      parameterId: asParameterId("screw.dynamic_load_rating_basis"),
      required: true,
    },
    {
      key: "static_load_rating",
      parameterId: asParameterId("screw.static_load_rating"),
      required: true,
    },
    {
      key: "preload",
      parameterId: asParameterId("screw.preload"),
      required: true,
    },
    {
      key: "internal_friction_coefficient",
      parameterId: asParameterId("screw.internal_friction_coefficient"),
      required: true,
    },
    {
      key: "mechanical_efficiency",
      parameterId: asParameterId("screw.mechanical_efficiency"),
      required: true,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("screw.gear_ratio"),
      // Optional: the registry's constant default (1, direct-connected) auto-
      // fills an absent value (lib/engine/module-sdk/execute.ts resolveModuleInput).
      required: false,
    },
    {
      key: "static_safety_factor_minimum",
      parameterId: asParameterId("screw.static_safety_factor_minimum"),
      required: true,
    },
    {
      key: "buckling_safety_margin",
      parameterId: asParameterId("screw.buckling_safety_margin"),
      required: true,
    },
    {
      key: "manufacturer_speed_limit",
      parameterId: asParameterId("screw.manufacturer_speed_limit"),
      // Optional: the DN-limit check only evaluates when the specific
      // screw's own catalog data supplies it (stage-1-spec.md item 9).
      required: false,
    },
    ...CASES.flatMap(perCaseInputPorts),
  ],
  outputs: [
    ...CASES.flatMap(perCaseOutputPorts),
    {
      key: "equivalent_dynamic_load",
      parameterId: asParameterId("screw.equivalent_dynamic_load"),
    },
    {
      key: "mean_rotational_speed",
      parameterId: asParameterId("screw.mean_rotational_speed"),
    },
    {
      key: "nominal_life",
      parameterId: asParameterId("screw.nominal_life"),
    },
    {
      key: "nominal_life_hours",
      parameterId: asParameterId("screw.nominal_life_hours"),
    },
    {
      key: "buckling_load",
      parameterId: asParameterId("screw.buckling_load"),
    },
    {
      key: "permissible_compressive_load",
      parameterId: asParameterId("screw.permissible_compressive_load"),
    },
    {
      key: "critical_speed",
      parameterId: asParameterId("screw.critical_speed"),
    },
    {
      key: "permissible_speed",
      parameterId: asParameterId("screw.permissible_speed"),
    },
  ],
};
