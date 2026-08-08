// Pure, deterministic compute function for the motion-profile module (v0.1.0
// draft, Stage 3). Resolves a single symmetric trapezoidal/triangular move,
// optionally followed by one dwell, as the whole motion cycle (see
// ./manifest.ts for why the package stops at one optional dwell rather than
// an arbitrary N-segment cycle). Reads input magnitudes in their canonical
// units, delegates the physics to the pure kernels in ./math and ./cycle,
// and returns a structured computation. Performs no I/O and imports only the
// engine's public surface and this module's own files.

import type { ModuleComputation, ModuleInput, Warning } from "@/lib/engine";
import { makeQuantity } from "@/lib/engine";
import { resolveTrapezoidalMove } from "./math";
import { resolveMotionCycle, type MotionSegment } from "./cycle";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const moveDistance = quantityAt(values, "move_distance");
  const maxVelocity = quantityAt(values, "max_velocity");
  const maxAcceleration = quantityAt(values, "max_acceleration");
  if (
    moveDistance === undefined ||
    maxVelocity === undefined ||
    maxAcceleration === undefined
  ) {
    throw new Error(
      'motion-profile requires "move_distance", "max_velocity", and "max_acceleration".',
    );
  }
  const dwellTime = quantityAt(values, "dwell_time");

  const moveInput = {
    moveDistanceM: moveDistance.value,
    maxVelocityMps: maxVelocity.value,
    maxAccelerationMps2: maxAcceleration.value,
  };
  const result = resolveTrapezoidalMove(moveInput);

  const segments: MotionSegment[] = [
    { kind: "move", ...moveInput },
    ...(dwellTime !== undefined
      ? [{ kind: "dwell" as const, dwellTimeS: dwellTime.value }]
      : []),
  ];
  const cycle = resolveMotionCycle(segments);

  const warnings: Warning[] =
    result.profileType === "triangular"
      ? [
          {
            id: "triangular-profile",
            message:
              "The move distance is too short to reach the declared velocity ceiling under the declared acceleration ceiling; the resolved peak velocity is below max_velocity. This is expected triangular-profile behavior, not a failure.",
          },
        ]
      : [];

  return {
    outputs: {
      move_time: makeQuantity(result.moveTimeS, "s"),
      cycle_time: makeQuantity(cycle.cycleTimeS, "s"),
      peak_velocity: makeQuantity(cycle.peakVelocityMps, "m/s"),
      peak_acceleration: makeQuantity(cycle.peakAccelerationMps2, "m/s^2"),
      peak_deceleration: makeQuantity(cycle.peakDecelerationMps2, "m/s^2"),
      rms_acceleration: makeQuantity(cycle.rmsAccelerationMps2, "m/s^2"),
    },
    trace: buildTrace({
      moveDistance,
      maxVelocity,
      maxAcceleration,
      dwellTime,
      result,
      cycle,
    }),
    checks: buildChecks({
      moveDistance,
      maxVelocity,
      maxAcceleration,
      dwellTime,
    }),
    warnings,
    assumptions: [
      {
        id: "scope-single-move-optional-dwell",
        statement:
          "This module version (0.1.0) resolves a single symmetric trapezoidal/triangular move, optionally followed by one dwell, as the whole motion cycle (accelerating and decelerating phases use the same acceleration magnitude). Asymmetric acceleration/deceleration, jerk-limited S-curve profiles, and more than one move per cycle are out of scope for this version.",
      },
    ],
    validity: [],
  };
}
