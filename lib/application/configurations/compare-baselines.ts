// The `compareBaselines` use case (Unit 2.9 part 2) — loads two owned
// baselines and diffs them with lib/configuration's pure
// `compareBaselineSnapshots` (context/architecture.md "lib/application/":
// "Generate reports" is the closest named responsibility; comparing two
// already-persisted immutable snapshots is the read-only sibling of
// `createBaseline`). Does not re-read live project state or re-execute
// anything — invariant "Trace-driven reporting" applied to baselines too.

import "server-only";
import {
  compareBaselineSnapshots,
  type BaselineComparison,
} from "@/lib/configuration";
import {
  loadMachineBaseline,
  type MachineBaselineId,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of a `compareBaselines` failure. */
export type CompareBaselinesErrorCode = "not_found";

/** A failed {@link compareBaselines} outcome. */
export interface CompareBaselinesError {
  readonly code: CompareBaselinesErrorCode;
  readonly message: string;
}

/**
 * Result of {@link compareBaselines} — a discriminated success/error result,
 * not a throw, so a route handler renders either outcome without a
 * try/catch for expected domain failures.
 */
export type CompareBaselinesResult =
  | { readonly ok: true; readonly comparison: BaselineComparison }
  | { readonly ok: false; readonly error: CompareBaselinesError };

/**
 * Compares two baselines, scoped to `ownerId`. Both must exist and be owned
 * by the caller; neither needs to belong to the same configuration (a cross-
 * configuration comparison is still a well-formed diff, just an unusual one
 * — the caller decides whether that is meaningful).
 */
export async function compareBaselines(
  beforeBaselineId: MachineBaselineId,
  afterBaselineId: MachineBaselineId,
  ownerId: UserId,
): Promise<CompareBaselinesResult> {
  const [before, after] = await Promise.all([
    loadMachineBaseline(beforeBaselineId, ownerId),
    loadMachineBaseline(afterBaselineId, ownerId),
  ]);
  if (before === null) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: `Baseline "${beforeBaselineId}" not found or not owned by this user.`,
      },
    };
  }
  if (after === null) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: `Baseline "${afterBaselineId}" not found or not owned by this user.`,
      },
    };
  }
  return {
    ok: true,
    comparison: compareBaselineSnapshots(before.snapshot, after.snapshot),
  };
}
