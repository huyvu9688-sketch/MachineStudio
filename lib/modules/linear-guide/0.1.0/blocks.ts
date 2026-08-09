// The four load-bearing blocks of this module's fixed arrangement, in PMI's
// own P1-P4 order. Kept in its own file because ./compute.ts, ./trace.ts, and
// the module's tests all address blocks by key, and routing that shared
// vocabulary through compute.ts would make trace.ts and compute.ts import each
// other's types.

import type { FourBlockLoads } from "./math";

/** Block keys in the fixed order PMI's own P1-P4 numbering uses. */
export const BLOCK_KEYS = [
  "block1",
  "block2",
  "block3",
  "block4",
] as const satisfies readonly (keyof FourBlockLoads)[];

/** One of the four load-bearing blocks, addressed by PMI's own numbering. */
export type BlockKey = (typeof BLOCK_KEYS)[number];

/**
 * Picks the block whose equivalent load governs. Ties keep the lowest-numbered
 * block (strict `>`), so the choice is deterministic for a symmetric load —
 * which is not a corner case here but the common one: a centred load puts an
 * identical equivalent load on all four blocks.
 */
export function governingBlock(
  equivalentLoadsN: Readonly<Record<BlockKey, number>>,
): BlockKey {
  let governing: BlockKey = "block1";
  for (const key of BLOCK_KEYS) {
    if (equivalentLoadsN[key] > equivalentLoadsN[governing]) {
      governing = key;
    }
  }
  return governing;
}
