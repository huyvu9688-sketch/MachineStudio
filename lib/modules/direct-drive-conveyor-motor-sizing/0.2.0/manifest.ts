// Manifest and ports for the direct-drive-conveyor-motor-sizing module
// (Unit 6.3). Self-contained per ADR-0011 "Reuse policy": no
// CALCULATION-level dependency on any Milestone-4 discipline module or on
// ball-screw-motor-sizing@0.1.0 (see math.ts's own module doc comment).
// This module does not reuse any released `motion.axis.*` mass/friction
// parameter beyond `gravity` -- stage-1-spec.md "Relationship to Existing
// and Planned Modules" and stage-2-contract.md "Reused without change"
// both record why: a belt conveyor's own geometry, mass, and friction
// terms share no meaning with a ball-screw axis's.
//
// 0.2.0: consistency-pass follow-on
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md)
// -- drops the `gravity` port (hardcoded 9.80665 m/s^2 in ./math.ts
// instead) and repoints `inertia_ratio_maximum` at the new
// `motor_sizing.direct_drive_conveyor.inertia_ratio_recommended_maximum`
// parameter (registry 1.15.0), which carries a founder-directed default of
// 10. 0.1.0 stays released, registered, and untouched.
//
// Registered 2026-08-19 as `direct-drive-conveyor-motor-sizing@0.2.0`
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
  id: "direct-drive-conveyor-motor-sizing",
  version: "0.2.0",
  sdkRange: { min: "1.0.0" },
  // Authored against registry 1.15.0. Keep this literal -- never import the
  // mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.15.0",
  category: "motor-sizing.direct-drive-conveyor",
  tags: ["motor-sizing", "conveyor", "belt-conveyor", "direct-drive"],
  // No linear-axis@1 role: this module is not part of that workflow, the
  // same "no workflowRoles" treatment ball-screw-motor-sizing@0.1.0
  // already established for the Motor Sizing Tool family.
  workflowRoles: [],
  validityEnvelopeSummary:
    "One horizontal belt conveyor: a drive roller directly connected to the motor (i = 1, no gearbox -- not merely a ratio of 1, this module's own input schema has no gear-ratio port at all) and one idler roller, which may differ in diameter from the drive roller. One accelerate-to-speed event from standstill to a commanded target belt speed -- not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed (stage-2-contract.md 'Decisions' item 3). No incline, no thermal derating, no belt-slip check. No motor catalog matching: outputs are required specs only (torque, speed, power, inertia), checked against one engineer-supplied required-torque safety factor (>= 1) and one engineer-supplied maximum inertia ratio -- not a known candidate motor's own rated torque, which this module does not take as an input at all.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId("jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    // Roller, belt, and load geometry/mass.
    {
      key: "drive_roller_diameter",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.drive_roller_diameter",
      ),
      required: true,
    },
    {
      key: "drive_roller_mass",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.drive_roller_mass",
      ),
      required: true,
    },
    {
      key: "idler_roller_diameter",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.idler_roller_diameter",
      ),
      required: true,
    },
    {
      key: "idler_roller_mass",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.idler_roller_mass",
      ),
      required: true,
    },
    {
      key: "belt_mass",
      parameterId: asParameterId("motor_sizing.direct_drive_conveyor.belt_mass"),
      required: true,
    },
    {
      key: "carried_load_mass",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.carried_load_mass",
      ),
      required: true,
    },

    // Friction, efficiency, environment.
    {
      key: "belt_friction_coefficient",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.belt_friction_coefficient",
      ),
      required: true,
    },
    {
      key: "mechanical_efficiency",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.mechanical_efficiency",
      ),
      required: true,
    },
    // Motion: a single accelerate-to-speed event (stage-2-contract.md
    // "Decisions" item 3).
    {
      key: "target_belt_speed",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.target_belt_speed",
      ),
      required: true,
    },
    {
      key: "acceleration_time",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.acceleration_time",
      ),
      required: true,
    },

    // Motor input.
    {
      key: "motor_rotor_inertia",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.motor_rotor_inertia",
      ),
      required: true,
    },

    // Safety-factor and limit inputs, required, no built-in default.
    {
      key: "required_torque_safety_factor",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.required_torque_safety_factor",
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
      // motor_sizing.direct_drive_conveyor.inertia_ratio_maximum, untouched.
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.inertia_ratio_recommended_maximum",
      ),
      required: true,
    },
  ] satisfies ModuleInputPort[],
  outputs: [
    {
      key: "reflected_load_inertia",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.reflected_load_inertia",
      ),
    },
    {
      key: "total_system_inertia",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.total_system_inertia",
      ),
    },
    {
      key: "inertia_ratio",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.inertia_ratio",
      ),
    },
    {
      key: "load_torque",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.load_torque",
      ),
    },
    {
      key: "acceleration_torque",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.acceleration_torque",
      ),
    },
    {
      key: "momentary_torque",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.momentary_torque",
      ),
    },
    {
      key: "required_torque",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.required_torque",
      ),
    },
    {
      key: "operating_speed",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.operating_speed",
      ),
    },
    {
      key: "required_power",
      parameterId: asParameterId(
        "motor_sizing.direct_drive_conveyor.required_power",
      ),
    },
  ] satisfies ModuleOutputPort[],
};
