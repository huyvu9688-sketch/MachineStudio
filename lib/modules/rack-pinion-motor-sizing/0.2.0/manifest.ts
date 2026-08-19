// Manifest and ports for the rack-pinion-motor-sizing module (Unit 6.4).
// Architecturally closer to ball-screw-motor-sizing@0.1.0 than to
// direct-drive-conveyor-motor-sizing@0.1.0 -- a rack-and-pinion axis is
// the same "one rigid carriage on a guide" mechanism class as a ball
// screw (stage-1-spec.md "Relationship to Existing and Planned
// Modules"). Reuses motion.axis.* directly for orientation, incline,
// gravity, friction, and mass -- the identical physical interface and
// formula shape ball-screw-motor-sizing@0.1.0 already reuses, confirmed
// by the same primary source printing both mechanisms' own force
// formula identically (stage-1-spec.md "Candidate Methods" item 1). No
// calculation-level dependency on any other module (ADR-0011 "Reuse
// policy").
//
// 0.2.0: consistency-pass follow-on
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md)
// -- drops the `gravity` port (hardcoded 9.80665 m/s^2 in ./math.ts
// instead) and repoints `inertia_ratio_maximum` at the new
// `motor_sizing.rack_pinion.inertia_ratio_recommended_maximum` parameter
// (registry 1.15.0), which carries a founder-directed default of 10.
// 0.1.0 stays released, registered, and untouched.
//
// Registered 2026-08-19 as `rack-pinion-motor-sizing@0.2.0`
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
  id: "rack-pinion-motor-sizing",
  version: "0.2.0",
  sdkRange: { min: "1.0.0" },
  // Authored against registry 1.15.0. Keep this literal -- never import the
  // mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.15.0",
  category: "motor-sizing.rack-pinion",
  tags: ["motor-sizing", "rack-and-pinion", "servo-motor"],
  // No linear-axis@1 role: this module is not part of that workflow, the
  // same "no workflowRoles" treatment every Motor Sizing Tool module
  // already establishes.
  workflowRoles: [],
  validityEnvelopeSummary:
    "One rack-and-pinion linear axis: one pinion (the rack itself is treated as infinitely rigid/massless -- no source found this session gives the rack its own mass or inertia term), one rigid carriage/load, direct-connected or through a single fixed gear ratio. One accelerate-to-speed event from standstill to a commanded target velocity -- not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed. Horizontal, vertical, or inclined orientation (0 <= incline_angle <= 90 deg), validated end to end at exactly horizontal and vertical. No rack/pinion gear-tooth mechanical-strength check (root bending fatigue, Hertzian pitting fatigue) and no motor catalog matching: outputs are required specs only (torque, speed, power, inertia), checked against one engineer-supplied required-torque safety factor (>= 1) and one engineer-supplied maximum inertia ratio.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId("us.andantex.modular_rack_pinion_system@web-2026-08-13"),
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
      key: "friction_coefficient",
      parameterId: asParameterId("motion.axis.friction_coefficient"),
      required: true,
    },
    {
      key: "total_moving_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
      required: true,
    },

    // New rack-and-pinion geometry/drive terms.
    {
      key: "pinion_pitch_diameter",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.pinion_pitch_diameter",
      ),
      required: true,
    },
    {
      key: "pinion_mass",
      parameterId: asParameterId("motor_sizing.rack_pinion.pinion_mass"),
      required: true,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("motor_sizing.rack_pinion.gear_ratio"),
      // Optional: the registry's own constant default (1) auto-fills an
      // absent value.
      required: false,
    },
    {
      key: "mechanical_efficiency",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.mechanical_efficiency",
      ),
      required: true,
    },
    {
      key: "external_force",
      parameterId: asParameterId("motor_sizing.rack_pinion.external_force"),
      // Optional: constant default 0 N.
      required: false,
    },

    // Motion: a single accelerate-to-speed event (stage-2-contract.md
    // "Decisions" item 4).
    {
      key: "target_velocity",
      parameterId: asParameterId("motor_sizing.rack_pinion.target_velocity"),
      required: true,
    },
    {
      key: "acceleration_time",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.acceleration_time",
      ),
      required: true,
    },

    // Motor input.
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.motor_rotor_inertia",
      ),
      required: true,
    },

    // Safety-factor and limit inputs, required, no built-in default.
    {
      key: "required_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.required_torque_safety_factor",
      ),
      required: true,
    },
    {
      key: "inertia_ratio_maximum",
      // 0.2.0: repointed at the new recommended-maximum parameter (registry
      // 1.15.0) -- a founder-directed default of 10, still overridable. The
      // port key stays "inertia_ratio_maximum" for compute/UI stability;
      // only the parameterId it maps to changes. 0.1.0's own port still
      // points at the original required-no-default
      // motor_sizing.rack_pinion.inertia_ratio_maximum, untouched.
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.inertia_ratio_recommended_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
  outputs: [
    {
      key: "pinion_inertia",
      parameterId: asParameterId("motor_sizing.rack_pinion.pinion_inertia"),
    },
    {
      key: "load_inertia",
      parameterId: asParameterId("motor_sizing.rack_pinion.load_inertia"),
    },
    {
      key: "reflected_load_inertia",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.reflected_load_inertia",
      ),
    },
    {
      key: "total_system_inertia",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.total_system_inertia",
      ),
    },
    {
      key: "inertia_ratio",
      parameterId: asParameterId("motor_sizing.rack_pinion.inertia_ratio"),
    },
    {
      key: "load_torque",
      parameterId: asParameterId("motor_sizing.rack_pinion.load_torque"),
    },
    {
      key: "acceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.acceleration_torque",
      ),
    },
    {
      key: "momentary_torque",
      parameterId: asParameterId(
        "motor_sizing.rack_pinion.momentary_torque",
      ),
    },
    {
      key: "required_torque",
      parameterId: asParameterId("motor_sizing.rack_pinion.required_torque"),
    },
    {
      key: "operating_speed",
      parameterId: asParameterId("motor_sizing.rack_pinion.operating_speed"),
    },
    {
      key: "required_power",
      parameterId: asParameterId("motor_sizing.rack_pinion.required_power"),
    },
  ] satisfies ModuleOutputPort[],
};
