// Manifest and ports for the motion-profile module (Unit 4.2, released).
//
// v0.1.0 scope: up to MAX_MOVES moves, each optionally followed by its own
// dwell, as the whole motion cycle. context/modules/motion-profile/
// stage-2-contract.md left the exact port cardinality open ("either a
// `table`-valued parameter... or a deliberate, evidence-backed maximum
// segment count"); table-valued parameter support does not exist in the
// registry yet, and no in-repo evidence fixes a "correct" segment count for
// this founder's own machines, so MAX_MOVES = 5 is a deliberate product
// decision made directly by the founder (not sourced from a published
// method — there is nothing to cite), recorded in that document's
// "Decisions" item 4. Each move gets its own `move_{index}_distance` /
// `move_{index}_max_velocity` / `move_{index}_max_acceleration` port trio
// (only move 1's trio is required) plus an optional `dwell_{index}_time`
// trailing it — the same "per-instance port on a fixed cardinality" pattern
// axis-load-cases used for its per-case ports, applied to a move index
// instead of a load case. `./input-schema.ts` enforces that supplied moves
// are contiguous starting at move 1, that a move's three fields are all
// present or all absent, and that a dwell's own move is present.
//
// Released and registered 2026-08-12 as motion-profile@0.1.0
// (lib/modules/registry.generated.ts, validation/motion-profile/0.1.0.md).

import {
  asParameterId,
  type ModuleInputPort,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";

/** Maximum number of move segments one cycle can express (see the file header). */
export const MAX_MOVES = 5;

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "motion-profile",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.2.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.2.0",
  category: "motion.profile",
  tags: ["motion", "profile", "kinematics"],
  // linear-axis@1's "linear-axis.motion" role (Unit 4.8,
  // lib/workflows/linear-axis/1.0.0/definition.ts).
  workflowRoles: ["linear-axis.motion"],
  validityEnvelopeSummary:
    "One to five single-axis positioning moves (move 1 required, moves 2-5 optional but must be supplied contiguously), each optionally followed by its own dwell, as the whole motion cycle; symmetric trapezoidal or triangular acceleration/deceleration profile only (asymmetric and jerk-limited S-curve profiles are out of scope); every supplied move_distance > 0, max_velocity > 0, max_acceleration > 0, every supplied dwell_time >= 0; no structural compliance, resonance/bandwidth limiting, or encoder/servo loop dynamics.",
  // Elementary constant-acceleration kinematics and time-weighted RMS
  // arithmetic; no manufacturer-specific citation is meaningful for the base
  // equations (see context/modules/motion-profile/stage-1-spec.md
  // "Candidate Method — Single Trapezoidal Move" and stage-2-contract.md
  // "Decisions" item 1), so no source revision is declared.
  sourceRevisionIds: [],
};

function moveSegmentPorts(index: number): ModuleInputPort[] {
  return [
    {
      key: `move_${index}_distance`,
      parameterId: asParameterId("motion.profile.move_distance"),
      required: index === 1,
    },
    {
      key: `move_${index}_max_velocity`,
      parameterId: asParameterId("motion.profile.max_velocity"),
      required: index === 1,
    },
    {
      key: `move_${index}_max_acceleration`,
      parameterId: asParameterId("motion.profile.max_acceleration"),
      required: index === 1,
    },
    {
      key: `dwell_${index}_time`,
      parameterId: asParameterId("motion.profile.dwell_time"),
      // Optional: absent means this move is not followed by a dwell.
      required: false,
    },
  ];
}

export const ports: ModulePorts = {
  inputs: Array.from({ length: MAX_MOVES }, (_, i) =>
    moveSegmentPorts(i + 1),
  ).flat(),
  outputs: [
    // Cycle-level aggregates only (stage-2-contract.md "Decisions" item 2):
    // per-move detail (each move's own move_time, peak velocity, phase
    // times) lives in the calculation trace, not a canonical port, because a
    // per-move output port cannot be conditionally absent — every declared
    // output port must be produced on every run regardless of how many of
    // the (up to MAX_MOVES) moves were actually supplied
    // (lib/engine/module-sdk/execute.ts rejects a missing declared output).
    {
      key: "cycle_time",
      parameterId: asParameterId("motion.profile.cycle_time"),
    },
    {
      key: "peak_velocity",
      parameterId: asParameterId("motion.profile.peak_velocity"),
    },
    {
      key: "peak_acceleration",
      parameterId: asParameterId("motion.profile.peak_acceleration"),
    },
    {
      key: "peak_deceleration",
      parameterId: asParameterId("motion.profile.peak_deceleration"),
    },
    {
      key: "rms_acceleration",
      parameterId: asParameterId("motion.profile.rms_acceleration"),
    },
  ],
};
