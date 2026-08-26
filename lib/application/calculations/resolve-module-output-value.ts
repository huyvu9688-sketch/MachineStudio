// Shared by `executeModuleInstance` (Unit 2.4, actually pulls the value at
// Run time) and `loadModuleWorkspaceView` (Unit 3.3, previews the same
// outcome so the generic renderer can warn about it before Run is even
// clicked) — one function, so the two can never quietly disagree about what
// "resolved" means for a module-output link.

import "server-only";
import {
  loadCalculationRun,
  loadModuleInstanceForOwner,
  listRunsForModuleInstance,
  type DbClient,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";
import { getModulePackage } from "@/lib/modules";
import type { EngineeringValue, LoadCaseCategory } from "@/lib/engine";

/**
 * The outcome of resolving a linked module-output source: a concrete value, a
 * refusal because the upstream result is known to be out of date, or nothing
 * resolvable (the source has never been run, isn't owned by the caller, or
 * its package/output port can no longer be found).
 */
export type UpstreamValue =
  | { readonly kind: "value"; readonly value: EngineeringValue }
  | { readonly kind: "stale"; readonly staleReason: string | null }
  | { readonly kind: "unresolved" };

/**
 * Resolves the value a confirmed link to a module-output source carries,
 * pulling it from that source module's latest calculation run
 * (`lib/db/repositories/graph-repository.ts`'s `resolveLinkedSourceValue`
 * deliberately returns `null` for this case: "its value comes from that
 * module's calculation run, wired in the execution service (Unit 2.4)").
 *
 * Returns `unresolved` when the source has no run yet, isn't owned by
 * `ownerId`, or its package/output port can no longer be found — the caller
 * then leaves the input port unresolved, and `executeModule` reports a clear
 * "missing required input" rather than this function inventing a value.
 *
 * Returns `stale` when the source's latest run is marked stale: an upstream
 * input changed after that run was computed, so its outputs no longer follow
 * from the current design. Consuming one would persist a fresh-looking run
 * built on superseded numbers, which is exactly what the stale flag exists to
 * prevent. Every run of an affected module instance is marked stale together
 * (`markRunsStaleForModuleInstances`), so there is no older, "less stale" run
 * to fall back to — the upstream module has to be re-run first.
 */
export async function resolveModuleOutputValue(
  sourceModuleInstanceId: ModuleInstanceId,
  sourceParameterId: string,
  sourceLoadCase: LoadCaseCategory | null,
  ownerId: UserId,
  client: DbClient,
): Promise<UpstreamValue> {
  const sourceContext = await loadModuleInstanceForOwner(
    sourceModuleInstanceId,
    ownerId,
    client,
  );
  if (sourceContext === null) {
    return { kind: "unresolved" };
  }
  const sourcePkg = getModulePackage(
    sourceContext.moduleInstance.modulePackageId,
    sourceContext.moduleInstance.moduleVersion,
  );
  if (sourcePkg === undefined) {
    return { kind: "unresolved" };
  }
  const outputPort = sourcePkg.ports.outputs.find(
    (port) =>
      port.parameterId === sourceParameterId &&
      (port.loadCase ?? null) === sourceLoadCase,
  );
  if (outputPort === undefined) {
    return { kind: "unresolved" };
  }

  const summaries = await listRunsForModuleInstance(
    sourceModuleInstanceId,
    ownerId,
    client,
  );
  const latest = summaries[0];
  if (latest === undefined) {
    return { kind: "unresolved" };
  }
  if (latest.stale) {
    return { kind: "stale", staleReason: latest.staleReason };
  }
  const latestRun = await loadCalculationRun(latest.id, ownerId, client);
  const value = latestRun?.snapshot.computation.outputs[outputPort.key];
  return value === undefined
    ? { kind: "unresolved" }
    : { kind: "value", value };
}
