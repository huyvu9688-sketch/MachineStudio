// Manifest and ports for the belt-pulley-drive-motor-sizing module (Unit
// 6.5). Shares its load-torque/force formula shape with
// rack-pinion-motor-sizing@0.1.0 (both trace to the same Oriental Motor
// source page, "Wire Belt Mechanism, Rack and Pinion Mechanism" --
// stage-1-spec.md "The central finding"), so this module also reuses
// motion.axis.* directly for orientation, incline, gravity, friction, and
// mass. What genuinely differs, and is why this is a separate module: two
// pulleys instead of one pinion, and a belt that carries its own
// translating mass (a fixed rack carries none) -- see
// motor_sizing.belt_pulley.pulley_mass/idler_pulley_mass/belt_mass. No
// calculation-level dependency on any other module (ADR-0011 "Reuse
// policy").
//
// Registered as `belt-pulley-drive-motor-sizing@0.1.0`
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
  id: "belt-pulley-drive-motor-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.12.0, the version that released this
  // module's own motor_sizing.belt_pulley.* group (stage-2-contract.md).
  // Keep this literal -- never import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.12.0",
  category: "motor-sizing.belt-pulley-drive",
  tags: ["motor-sizing", "belt-drive", "pulley", "servo-motor"],
  // No linear-axis@1 role: this module is not part of that workflow, the
  // same "no workflowRoles" treatment every Motor Sizing Tool module
  // already establishes.
  workflowRoles: [],
  validityEnvelopeSummary:
    "One belt-and-pulley linear drive: one motor-driven pulley plus one idler pulley of equal pitch diameter (every source's own worked example assumes this), one rigid carriage/table rigidly attached to the belt (not a conveyor's loose load), direct-connected or through a single fixed gear ratio. One accelerate-to-speed event from standstill to a commanded target velocity -- not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed. Horizontal, vertical, or inclined orientation (0 <= incline_angle <= 90 deg) -- both primary sources carry an explicit gravity term. No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection, and no motor catalog matching: outputs are required specs only (torque, speed, power, inertia), checked against one engineer-supplied required-torque safety factor (>= 1) and one engineer-supplied maximum inertia ratio.",
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
    // Geometry, mass, environment (reused motion.axis.* directly).
    {
      key: "orientation",
      parameterId: asParameterId("motion.axis.orientation"),
      required: true,
    },
    {
      key: "incline_angle",
      parameterId: asParameterId("motion.axis.incline_angle"),
      required: true,
    },
    {
      key: "gravity",
      parameterId: asParameterId("motion.axis.gravity"),
      // Optional: the registry's own constant default (9.80665 m/s^2)
      // auto-fills an absent value.
      required: false,
    },
    {
      key: "friction_coefficient",
      parameterId: asParameterId("motion.axis.friction_coefficient"),
      required: true,
    },
    {
      key: "total_moving_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
      required: true,
    },

    // New belt/pulley geometry and drive terms.
    {
      key: "pulley_pitch_diameter",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.pulley_pitch_diameter",
      ),
      required: true,
    },
    {
      key: "pulley_mass",
      parameterId: asParameterId("motor_sizing.belt_pulley.pulley_mass"),
      required: true,
    },
    {
      key: "idler_pulley_mass",
      parameterId: asParameterId("motor_sizing.belt_pulley.idler_pulley_mass"),
      required: true,
    },
    {
      key: "belt_mass",
      parameterId: asParameterId("motor_sizing.belt_pulley.belt_mass"),
      // Optional: constant default 0 kg (stage-2-contract.md "Decisions"
      // item 5 -- a structural "belt mass not tracked" default).
      required: false,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("motor_sizing.belt_pulley.gear_ratio"),
      // Optional: the registry's own constant default (1) auto-fills an
      // absent value.
      required: false,
    },
    {
      key: "mechanical_efficiency",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.mechanical_efficiency",
      ),
      required: true,
    },
    {
      key: "external_force",
      parameterId: asParameterId("motor_sizing.belt_pulley.external_force"),
      // Optional: constant default 0 N.
      required: false,
    },

    // Motion: a single accelerate-to-speed event (stage-2-contract.md
    // "Decisions" item 6).
    {
      key: "target_velocity",
      parameterId: asParameterId("motor_sizing.belt_pulley.target_velocity"),
      required: true,
    },
    {
      key: "acceleration_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.acceleration_time"),
      required: true,
    },

    // Motor input.
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.motor_rotor_inertia",
      ),
      required: true,
    },

    // Safety-factor and limit inputs, required, no built-in default.
    {
      key: "required_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.required_torque_safety_factor",
      ),
      required: true,
    },
    {
      key: "inertia_ratio_maximum",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.inertia_ratio_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
  outputs: [
    {
      key: "pulley_inertia",
      parameterId: asParameterId("motor_sizing.belt_pulley.pulley_inertia"),
    },
    {
      key: "belt_inertia",
      parameterId: asParameterId("motor_sizing.belt_pulley.belt_inertia"),
    },
    {
      key: "load_inertia",
      parameterId: asParameterId("motor_sizing.belt_pulley.load_inertia"),
    },
    {
      key: "reflected_load_inertia",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.reflected_load_inertia",
      ),
    },
    {
      key: "total_system_inertia",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.total_system_inertia",
      ),
    },
    {
      key: "inertia_ratio",
      parameterId: asParameterId("motor_sizing.belt_pulley.inertia_ratio"),
    },
    {
      key: "load_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.load_torque"),
    },
    {
      key: "acceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.acceleration_torque",
      ),
    },
    {
      key: "momentary_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.momentary_torque"),
    },
    {
      key: "required_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.required_torque"),
    },
    {
      key: "operating_speed",
      parameterId: asParameterId("motor_sizing.belt_pulley.operating_speed"),
    },
    {
      key: "required_power",
      parameterId: asParameterId("motor_sizing.belt_pulley.required_power"),
    },
  ] satisfies ModuleOutputPort[],
};
