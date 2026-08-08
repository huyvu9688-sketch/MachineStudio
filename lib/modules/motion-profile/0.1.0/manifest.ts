// Manifest and ports for the motion-profile module (Unit 4.2, Stage 3 draft).
//
// v0.1.0 scope: one move, optionally followed by one dwell, as the whole
// motion cycle — the smallest package extension that meaningfully exercises
// the multi-segment cycle kernel (./cycle.ts, resolveMotionCycle) without
// inventing an arbitrary N-segment port cardinality. Supporting more than one
// move per cycle would need either a fixed maximum segment count (an
// arbitrary product-scope decision context/modules/motion-profile/
// stage-2-contract.md explicitly declined to invent) or a `table`-valued
// parameter (a generic-platform capability the registry does not have yet —
// same doc, "Multi-segment port shape"). One optional dwell needs neither: it
// reuses the already-released `motion.profile.dwell_time` parameter as a
// single extra optional port, the same "per-case port" pattern
// axis-load-cases used for its own multi-instance ports.
//
// This package is intentionally NOT registered: this directory has no
// `index.ts`, so `npm run registry:generate` cannot discover it (see
// ./README.md). Registration remains gated behind Unit 4.1's Definition of
// Done regardless (context/implementation-map.md Milestone 4 header).

import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "motion-profile",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.2.0. Keep this literal — never import
  // the mutable current-version constant (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.2.0",
  category: "motion.profile",
  tags: ["motion", "profile", "kinematics"],
  // No linear-axis@1 workflow role vocabulary exists yet (Unit 4.8 is not
  // started); leave empty rather than invent one.
  workflowRoles: [],
  validityEnvelopeSummary:
    "One single-axis positioning move, optionally followed by one dwell, as the whole motion cycle; symmetric trapezoidal or triangular acceleration/deceleration profile only (asymmetric and jerk-limited S-curve profiles are out of scope); move_distance > 0, max_velocity > 0, max_acceleration > 0, dwell_time >= 0 when supplied; no structural compliance, resonance/bandwidth limiting, or encoder/servo loop dynamics; more than one move per cycle is not exposed as a package port.",
  // Elementary constant-acceleration kinematics and time-weighted RMS
  // arithmetic; no manufacturer-specific citation is meaningful for the base
  // equations (see context/modules/motion-profile/stage-1-spec.md
  // "Candidate Method — Single Trapezoidal Move" and stage-2-contract.md
  // "Decisions" item 1), so no source revision is declared.
  sourceRevisionIds: [],
};

export const ports: ModulePorts = {
  inputs: [
    {
      key: "move_distance",
      parameterId: asParameterId("motion.profile.move_distance"),
      required: true,
    },
    {
      key: "max_velocity",
      parameterId: asParameterId("motion.profile.max_velocity"),
      required: true,
    },
    {
      key: "max_acceleration",
      parameterId: asParameterId("motion.profile.max_acceleration"),
      required: true,
    },
    {
      key: "dwell_time",
      parameterId: asParameterId("motion.profile.dwell_time"),
      // Optional: absent means the cycle is this single move only.
      required: false,
    },
  ],
  outputs: [
    {
      key: "move_time",
      parameterId: asParameterId("motion.profile.move_time"),
    },
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
