// Local EngineeringValue helpers for the motion-profile module. This module's
// ports are all scalar quantities, so only the `Quantity` reader is needed
// (contrast lib/modules/axis-load-cases/0.1.0/values.ts, which also reads
// vectors and enums for its axis-frame ports).

import type { EngineeringValue, ModuleInput, Quantity } from "@/lib/engine";

type ModuleValues = ModuleInput["values"];

/** Reads a port value as a `Quantity`, or `undefined` when absent/mismatched. */
export function quantityAt(
  values: ModuleValues,
  key: string,
): Quantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "quantity" ? value : undefined;
}

/** One move segment (1-indexed) resolved from `move_{index}_*` ports, plus its optional trailing `dwell_{index}_time`. */
export interface ResolvedMoveSegment {
  readonly index: number;
  readonly distance: Quantity;
  readonly maxVelocity: Quantity;
  readonly maxAcceleration: Quantity;
  /** Absent when this move is not followed by a dwell. */
  readonly dwellTime: Quantity | undefined;
}

/**
 * Reads the ordered move (+ optional trailing dwell) segments from resolved
 * input values, starting at move 1 and stopping at the first move index with
 * none of its three fields present. `./input-schema.ts` already rejects a
 * gap, a partially-supplied move, or a dwell with no move of its own before
 * compute ever runs; the errors thrown here are a defensive backstop, not the
 * primary validation path (the same redundancy the single-move package had
 * for its own already-required ports).
 */
export function readMoveSegments(
  values: ModuleValues,
  maxMoves: number,
): ResolvedMoveSegment[] {
  const segments: ResolvedMoveSegment[] = [];
  for (let index = 1; index <= maxMoves; index++) {
    const distance = quantityAt(values, `move_${index}_distance`);
    const maxVelocity = quantityAt(values, `move_${index}_max_velocity`);
    const maxAcceleration = quantityAt(
      values,
      `move_${index}_max_acceleration`,
    );
    if (
      distance === undefined &&
      maxVelocity === undefined &&
      maxAcceleration === undefined
    ) {
      break;
    }
    if (
      distance === undefined ||
      maxVelocity === undefined ||
      maxAcceleration === undefined
    ) {
      throw new Error(
        `motion-profile requires "move_${index}_distance", "move_${index}_max_velocity", and "move_${index}_max_acceleration" together.`,
      );
    }
    segments.push({
      index,
      distance,
      maxVelocity,
      maxAcceleration,
      dwellTime: quantityAt(values, `dwell_${index}_time`),
    });
  }
  return segments;
}
