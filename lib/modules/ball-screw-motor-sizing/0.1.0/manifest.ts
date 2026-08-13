// Manifest and ports for the ball-screw-motor-sizing module (Unit 6.2).
// Self-contained per ADR-0011 "Reuse policy": no CALCULATION-level
// dependency on axis-load-cases, ball-screw, motion-profile, or
// drive-train (see math.ts's own module doc comment). One incidental
// graph-level parameter link does exist and is confirmed, not hidden, by
// cross-module-links.test.ts: axis-load-cases@0.1.0's own resolved
// `total_moving_mass` output is link-compatible with this module's own
// `total_moving_mass` input (both reuse the identical
// `motion.axis.total_moving_mass` parameter ID) -- nothing wires it today
// (this module has no workflow role, below), and it does not involve any
// shared formula code. No `loadCases` on any port -- direction
// (forward/return) is encoded in the port key itself, not the registry's
// `LoadCaseCategory` axis (stage-2-contract.md "Decisions" item 2).
//
// Registered 2026-08-13 as `ball-screw-motor-sizing@0.1.0`
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
  id: "ball-screw-motor-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.9.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.9.0",
  category: "motor-sizing.ball-screw",
  tags: ["motor-sizing", "ball-screw", "servo-motor"],
  // No linear-axis@1 role: this module is not part of that workflow
  // (ADR-0011 hides the seven discipline categories from the default
  // picker but does not add this family to that workflow).
  workflowRoles: [],
  validityEnvelopeSummary:
    "One full point-to-point operating cycle on one ball-screw axis: a forward move (always present), an optional return move (same line, opposite direction), and an optional dwell. 'Forward' is the direction that moves away from gravity on a vertical/inclined axis; 'return' is gravity-assisted -- immaterial on a horizontal axis. Symmetric accel/decel magnitude within each move; forward and return may use different magnitudes from each other. No screw mechanical-strength check (buckling, critical speed, life, static safety factor -- that is ball-screw@0.1.0's own separate responsibility). No motor catalog matching: outputs are required specs only (torque, speed, power, inertia), checked against two engineer-supplied safety factors (>= 1, multiplying a computed torque up to a required minimum rating) and one engineer-supplied maximum inertia ratio -- not a known candidate motor's own rated torque, which this module does not take as an input at all.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    asSourceRevisionId("jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"),
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

    // Ball-screw geometry and drive terms (reused screw.* directly).
    {
      key: "lead",
      parameterId: asParameterId("screw.lead"),
      required: true,
    },
    {
      key: "gear_ratio",
      parameterId: asParameterId("screw.gear_ratio"),
      // Optional: the registry's own constant default (1) auto-fills an
      // absent value.
      required: false,
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

    // New motor_sizing.ball_screw.* geometry/mass/force inputs.
    {
      key: "screw_diameter",
      parameterId: asParameterId("motor_sizing.ball_screw.screw_diameter"),
      required: true,
    },
    {
      key: "screw_mass",
      parameterId: asParameterId("motor_sizing.ball_screw.screw_mass"),
      required: true,
    },
    {
      key: "external_force",
      parameterId: asParameterId("motor_sizing.ball_screw.external_force"),
      // Optional: constant default 0 N.
      required: false,
    },

    // Motion inputs -- distinct forward_*/return_*/dwell_time IDs, never an
    // indexed shared-ID family (stage-2-contract.md "Decisions" item 2).
    {
      key: "forward_move_distance",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.forward_move_distance",
      ),
      required: true,
    },
    {
      key: "forward_max_velocity",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.forward_max_velocity",
      ),
      required: true,
    },
    {
      key: "forward_max_acceleration",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.forward_max_acceleration",
      ),
      required: true,
    },
    {
      key: "return_move_distance",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.return_move_distance",
      ),
      // Optional; ./input-schema.ts requires it together with the next two
      // whenever any one is supplied.
      required: false,
    },
    {
      key: "return_max_velocity",
      parameterId: asParameterId("motor_sizing.ball_screw.return_max_velocity"),
      required: false,
    },
    {
      key: "return_max_acceleration",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.return_max_acceleration",
      ),
      required: false,
    },
    {
      key: "dwell_time",
      parameterId: asParameterId("motor_sizing.ball_screw.dwell_time"),
      // Optional: constant default 0 s.
      required: false,
    },

    // Motor input.
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId("motor_sizing.ball_screw.motor_rotor_inertia"),
      required: true,
    },

    // Safety-factor and limit inputs, required, no built-in default.
    {
      key: "effective_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.effective_torque_safety_factor",
      ),
      required: true,
    },
    {
      key: "momentary_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.momentary_torque_safety_factor",
      ),
      required: true,
    },
    {
      key: "inertia_ratio_maximum",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.inertia_ratio_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
  outputs: [
    {
      key: "screw_inertia",
      parameterId: asParameterId("motor_sizing.ball_screw.screw_inertia"),
    },
    {
      key: "load_inertia",
      parameterId: asParameterId("motor_sizing.ball_screw.load_inertia"),
    },
    {
      key: "reflected_load_inertia",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.reflected_load_inertia",
      ),
    },
    {
      key: "total_system_inertia",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.total_system_inertia",
      ),
    },
    {
      key: "inertia_ratio",
      parameterId: asParameterId("motor_sizing.ball_screw.inertia_ratio"),
    },
    {
      key: "forward_load_torque",
      parameterId: asParameterId("motor_sizing.ball_screw.forward_load_torque"),
    },
    {
      key: "return_load_torque",
      parameterId: asParameterId("motor_sizing.ball_screw.return_load_torque"),
    },
    {
      key: "forward_acceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.forward_acceleration_torque",
      ),
    },
    {
      key: "return_acceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.return_acceleration_torque",
      ),
    },
    {
      key: "momentary_torque",
      parameterId: asParameterId("motor_sizing.ball_screw.momentary_torque"),
    },
    {
      key: "effective_torque",
      parameterId: asParameterId("motor_sizing.ball_screw.effective_torque"),
    },
    {
      key: "operating_speed",
      parameterId: asParameterId("motor_sizing.ball_screw.operating_speed"),
    },
    {
      key: "required_motor_rated_torque",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.required_motor_rated_torque",
      ),
    },
    {
      key: "required_motor_peak_torque",
      parameterId: asParameterId(
        "motor_sizing.ball_screw.required_motor_peak_torque",
      ),
    },
    {
      key: "required_power",
      parameterId: asParameterId("motor_sizing.ball_screw.required_power"),
    },
  ] satisfies ModuleOutputPort[],
};
