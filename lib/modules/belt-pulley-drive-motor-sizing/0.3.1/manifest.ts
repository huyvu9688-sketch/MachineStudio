// Manifest and ports for belt-pulley-drive-motor-sizing 0.3.0 -- the
// consistency-pass follow-on to 0.2.0
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md),
// and the only module in this project consuming the shared `disabledWhen`
// UI capability. Three changes on top of everything 0.2.0 already computes:
// the `gravity` port is dropped (hardcoded 9.80665 m/s^2 in ./math.ts
// instead), `inertia_ratio_maximum` repoints at the new
// `motor_sizing.belt_pulley.inertia_ratio_recommended_maximum` parameter
// (registry 1.15.0, founder-directed default of 10), and `./ui.ts` wires
// `disabledWhen` on the four motion-mode-dependent fields
// (target_velocity/constant_velocity_time disable when motion_mode is
// "distance"; travel_distance/cycle_time disable when motion_mode is
// "velocity"). Self-contained: duplicates rather than imports 0.1.0's/
// 0.2.0's own unchanged kernel functions (stage-2-contract.md
// "cross-version reuse policy").
//
// Registered 2026-08-19 as `belt-pulley-drive-motor-sizing@0.3.0`
// (lib/modules/registry.generated.ts) -- imported by ./index.ts, which
// `npm run registry:generate` discovers. 0.1.0 and 0.2.0 stay registered,
// edited, and immutable exactly as released (CLAUDE.md).
//
// 0.3.1 (this version): formula-correctness patch, ports and scope
// otherwise unchanged from 0.3.0 -- two fixes in math.ts:
// resolveMomentaryTorque now returns max(|T_A+T_L|, |T_D-T_L|) instead of
// always assuming the acceleration phase governs (a fast deceleration_time
// relative to acceleration_time can make T_D the real peak); and
// resolveEffectiveTorque now adds a T_L^2*dwellTimeS holding term instead
// of treating the whole dwell phase as torque-free, matching this module's
// own already-documented "load torque is assumed constant across all four
// motion phases" assumption. See validation.ts "deviations".

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
  version: "0.3.1",
  sdkRange: { min: "1.0.0" },
  // Authored against registry 1.15.0. Keep this literal -- never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.15.0",
  category: "motor-sizing.belt-pulley-drive",
  tags: ["motor-sizing", "belt-drive", "pulley", "servo-motor", "duty-cycle"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "One belt-and-pulley linear drive: one motor-driven pulley plus one idler pulley of equal pitch diameter, one rigid carriage/table rigidly attached to the belt, direct-connected or through a single fixed gear ratio. A repeating trapezoidal motion cycle (accelerate/run/decelerate/dwell), entered either velocity-first (target_velocity + constant_velocity_time, distance and cycle time derived) or distance-first (travel_distance + cycle_time, velocity and run time derived) via motion_mode. Load torque is assumed constant across all four phases (this mechanism's own physics, not an approximation across a module boundary). Horizontal, vertical, or inclined orientation (0 <= incline_angle <= 90 deg). No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection, and no motor catalog matching: outputs are required specs only, checked against one engineer-supplied required-torque safety factor (>= 1) and one engineer-supplied maximum inertia ratio -- effective_torque has no pass/fail check in 0.2.0 (no universal continuous-torque acceptance criterion found for this mechanism family).",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
    asSourceRevisionId("jp.oriental_motor.motor_sizing_calculations@web-2026-08-08"),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    // Geometry, mass, environment (reused motion.axis.* directly, unchanged from 0.1.0).
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

    // Belt/pulley geometry and drive terms (unchanged from 0.1.0).
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
      required: false,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("motor_sizing.belt_pulley.gear_ratio"),
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
      required: false,
    },

    // Motion: NEW in 0.2.0 -- a repeating trapezoidal cycle, velocity-first
    // or distance-first per motion_mode. target_velocity/travel_distance/
    // constant_velocity_time/cycle_time are each optional at the manifest
    // level; ./input-schema.ts's own superRefine enforces which two are
    // actually required per mode (stage-2-contract.md "0.2.0 Addendum"
    // item 2).
    {
      key: "motion_mode",
      parameterId: asParameterId("motor_sizing.belt_pulley.motion_mode"),
      required: true,
    },
    {
      key: "target_velocity",
      parameterId: asParameterId("motor_sizing.belt_pulley.target_velocity"),
      required: false,
    },
    {
      key: "travel_distance",
      parameterId: asParameterId("motor_sizing.belt_pulley.travel_distance"),
      required: false,
    },
    {
      key: "acceleration_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.acceleration_time"),
      required: true,
    },
    {
      key: "deceleration_time",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.deceleration_time",
      ),
      required: true,
    },
    {
      key: "constant_velocity_time",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.constant_velocity_time",
      ),
      required: false,
    },
    {
      key: "cycle_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.cycle_time"),
      required: false,
    },
    {
      key: "dwell_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.dwell_time"),
      required: false,
    },

    // Motor input (unchanged from 0.1.0).
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.motor_rotor_inertia",
      ),
      required: true,
    },

    // Safety-factor and limit inputs (unchanged from 0.1.0).
    {
      key: "required_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.required_torque_safety_factor",
      ),
      required: true,
    },
    {
      key: "inertia_ratio_maximum",
      // 0.3.0: repointed at the new recommended-maximum parameter (registry
      // 1.15.0) -- a founder-directed default of 10, still overridable. The
      // port key stays "inertia_ratio_maximum" for compute/UI stability;
      // only the parameterId it maps to changes. 0.1.0's and 0.2.0's own
      // ports still point at the original required-no-default
      // motor_sizing.belt_pulley.inertia_ratio_maximum, untouched.
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.inertia_ratio_recommended_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
  outputs: [
    // Inertia and torque (unchanged from 0.1.0).
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

    // NEW in 0.2.0: always-reported motion-profile values (dual-role with
    // the input ports of the same key above) and the two new torque outputs.
    {
      key: "target_velocity",
      parameterId: asParameterId("motor_sizing.belt_pulley.target_velocity"),
    },
    {
      key: "travel_distance",
      parameterId: asParameterId("motor_sizing.belt_pulley.travel_distance"),
    },
    {
      key: "constant_velocity_time",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.constant_velocity_time",
      ),
    },
    {
      key: "cycle_time",
      parameterId: asParameterId("motor_sizing.belt_pulley.cycle_time"),
    },
    {
      key: "deceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.belt_pulley.deceleration_torque",
      ),
    },
    {
      key: "effective_torque",
      parameterId: asParameterId("motor_sizing.belt_pulley.effective_torque"),
    },
  ] satisfies ModuleOutputPort[],
};
