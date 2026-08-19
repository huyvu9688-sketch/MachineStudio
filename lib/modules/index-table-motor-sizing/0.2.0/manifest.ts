// Manifest and ports for the index-table-motor-sizing module (Unit 6.6),
// the fifth and last mechanism module in the Motor Sizing Tool family
// (ADR-0011). Genuinely different in kind from every sibling: an index
// table's own motion is rotary, commanded directly in angle/time -- no
// motion.axis.* reuse at all (stage-1-spec.md "Genuinely different in
// kind"). load_torque is a required INPUT with a 0 N*m structural
// default, not a computed output -- both primary sources independently
// omit a load-torque formula for this mechanism entirely (stage-1-spec.md
// "The central finding"). No calculation-level dependency on any other
// module (ADR-0011 "Reuse policy").
//
// Registered as `index-table-motor-sizing@0.1.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers.

import {
  asParameterId,
  type ModuleInputPort,
  type ModuleOutputPort,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "index-table-motor-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.13.0, the version that released this
  // module's own motor_sizing.index_table.* group (stage-2-contract.md).
  // Keep this literal -- never import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.13.0",
  category: "motor-sizing.index-table",
  tags: ["motor-sizing", "index-table", "rotary", "servo-motor"],
  // No linear-axis@1 role: this module is not part of that workflow, the
  // same "no workflowRoles" treatment every Motor Sizing Tool module
  // already establishes.
  workflowRoles: [],
  validityEnvelopeSummary:
    "One rotary index table: one rigid, disk-shaped table rotating about its own axis, direct-connected or through a single fixed gear ratio. Any mounted workpieces/fixtures are represented as one combined engineer-supplied inertia value, not modeled as discrete geometry. One index move -- a single accelerate-decelerate-to-stop event from standstill back to standstill, covering a commanded angle in a commanded time -- not a repeating duty cycle. load_torque is a required, engineer-supplied input defaulting to 0 N*m, not computed: both primary sources independently omit a load-torque formula for this mechanism, stating bearing/support friction is negligible. No motor catalog matching: outputs are required specs only (torque, speed, power, inertia), checked against one engineer-supplied required-torque safety factor (>= 1) and one engineer-supplied maximum inertia ratio.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    // Table geometry, mass, and mounted-load inertia.
    {
      key: "table_mass",
      parameterId: asParameterId("motor_sizing.index_table.table_mass"),
      required: true,
    },
    {
      key: "table_diameter",
      parameterId: asParameterId("motor_sizing.index_table.table_diameter"),
      required: true,
    },
    {
      key: "attached_load_inertia",
      parameterId: asParameterId(
        "motor_sizing.index_table.attached_load_inertia",
      ),
      // Optional: constant default 0 kg*m^2.
      required: false,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("motor_sizing.index_table.gear_ratio"),
      // Optional: the registry's own constant default (1) auto-fills an
      // absent value.
      required: false,
    },

    // Motion: a single index move, commanded directly in angle/time
    // (stage-2-contract.md "Decisions" item 5).
    {
      key: "index_angle",
      parameterId: asParameterId("motor_sizing.index_table.index_angle"),
      required: true,
    },
    {
      key: "index_time",
      parameterId: asParameterId("motor_sizing.index_table.index_time"),
      required: true,
    },
    {
      key: "acceleration_time",
      parameterId: asParameterId("motor_sizing.index_table.acceleration_time"),
      required: true,
    },

    // Load torque: engineer-supplied, defaults to 0 (stage-2-contract.md
    // "Decisions" item 3).
    {
      key: "load_torque",
      parameterId: asParameterId("motor_sizing.index_table.load_torque"),
      required: false,
    },

    // Motor input.
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId(
        "motor_sizing.index_table.motor_rotor_inertia",
      ),
      required: true,
    },

    // Safety-factor and limit inputs, required, no built-in default.
    {
      key: "required_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.index_table.required_torque_safety_factor",
      ),
      required: true,
    },
    {
      key: "inertia_ratio_maximum",
      parameterId: asParameterId(
        "motor_sizing.index_table.inertia_ratio_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
  outputs: [
    {
      key: "table_inertia",
      parameterId: asParameterId("motor_sizing.index_table.table_inertia"),
    },
    {
      key: "load_inertia",
      parameterId: asParameterId("motor_sizing.index_table.load_inertia"),
    },
    {
      key: "reflected_load_inertia",
      parameterId: asParameterId(
        "motor_sizing.index_table.reflected_load_inertia",
      ),
    },
    {
      key: "total_system_inertia",
      parameterId: asParameterId(
        "motor_sizing.index_table.total_system_inertia",
      ),
    },
    {
      key: "inertia_ratio",
      parameterId: asParameterId("motor_sizing.index_table.inertia_ratio"),
    },
    {
      key: "acceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.index_table.acceleration_torque",
      ),
    },
    {
      key: "momentary_torque",
      parameterId: asParameterId("motor_sizing.index_table.momentary_torque"),
    },
    {
      key: "required_torque",
      parameterId: asParameterId("motor_sizing.index_table.required_torque"),
    },
    {
      key: "operating_speed",
      parameterId: asParameterId("motor_sizing.index_table.operating_speed"),
    },
    {
      key: "required_power",
      parameterId: asParameterId("motor_sizing.index_table.required_power"),
    },
  ] satisfies ModuleOutputPort[],
};
