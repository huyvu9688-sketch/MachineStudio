// The `executeModuleInstance` use case (Unit 2.4) — the first
// `lib/application` boundary: multi-step use-case and transaction
// orchestration (context/architecture.md "lib/application/": "Execute and
// persist calculation runs"). It composes three existing boundaries without
// duplicating their logic:
//
//   - lib/modules — loads the pinned released package (never re-implements a
//     module's formulas).
//   - lib/db — authorizes the owner, resolves input sources (manual/
//     linked/default/workflow, Unit 2.2), and persists.
//   - lib/engine — executes the pure compute function (Unit 1.6) exactly as
//     the conformance suite does.
//
// Steps (context/implementation-map.md Unit 2.4): (1) authorize owner;
// (2) load the pinned module package; (3) resolve and validate inputs;
// (4) execute the pure module; (5) persist an immutable run; (6) update the
// module instance's status summary; (7) append an audit event. Steps 5-7 are
// atomic (context/code-standards.md "Application Services": "run storage
// ... and audit creation must be atomic when part of one use case") — the
// transaction is opened here, at the application-service boundary, not in
// lib/db.

import "server-only";
import {
  ENGINE_SDK_VERSION,
  ModuleSdkError,
  executeModule,
  resolveModuleInput,
  type EngineeringValue,
  type LoadCaseCategory,
  type ModuleComputation,
  type ModuleInput,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  appendAuditEvent,
  createCalculationRun,
  loadCalculationRun,
  loadModuleInstanceForOwner,
  listRunsForModuleInstance,
  prisma,
  resolveModuleInputs,
  updateModuleInstanceRunStatus,
  RUN_SNAPSHOT_FORMAT_VERSION,
  type CalculationRunSnapshot,
  type CalculationRunRecord,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";

/** Input to {@link executeModuleInstance}. */
export interface ExecuteModuleInstanceInput {
  readonly moduleInstanceId: ModuleInstanceId;
  readonly ownerId: UserId;
  /** Optional active load-case identifier, passed through to the module. */
  readonly loadCaseId?: string;
}

/** Machine-readable classification of an `executeModuleInstance` failure. */
export type ExecuteModuleInstanceErrorCode =
  | "unauthorized"
  | "module_not_found"
  | "invalid_input"
  | "stale_upstream";

/** A failed {@link executeModuleInstance} outcome. */
export interface ExecuteModuleInstanceError {
  readonly code: ExecuteModuleInstanceErrorCode;
  readonly message: string;
}

/**
 * Result of {@link executeModuleInstance} — a discriminated success/error
 * result (context/code-standards.md "Prefer discriminated unions ... for
 * result states"), not a throw, so a route handler renders either outcome
 * without a try/catch for expected domain failures.
 */
export type ExecuteModuleInstanceResult =
  | { readonly ok: true; readonly run: CalculationRunRecord }
  | { readonly ok: false; readonly error: ExecuteModuleInstanceError };

/**
 * The outcome of resolving a linked module-output source: a concrete value, a
 * refusal because the upstream result is known to be out of date, or nothing
 * resolvable.
 */
type UpstreamValue =
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
async function resolveModuleOutputValue(
  sourceModuleInstanceId: ModuleInstanceId,
  sourceParameterId: string,
  sourceLoadCase: LoadCaseCategory | null,
  ownerId: UserId,
): Promise<UpstreamValue> {
  const sourceContext = await loadModuleInstanceForOwner(sourceModuleInstanceId, ownerId);
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

  const summaries = await listRunsForModuleInstance(sourceModuleInstanceId, ownerId);
  const latest = summaries[0];
  if (latest === undefined) {
    return { kind: "unresolved" };
  }
  if (latest.stale) {
    return { kind: "stale", staleReason: latest.staleReason };
  }
  const latestRun = await loadCalculationRun(latest.id, ownerId);
  const value = latestRun?.snapshot.computation.outputs[outputPort.key];
  return value === undefined ? { kind: "unresolved" } : { kind: "value", value };
}

/**
 * Executes a module instance end to end: authorizes the owner, loads the
 * pinned module package, resolves its declared input ports to values, runs
 * the pure compute function, and persists the result as a new immutable
 * calculation run — updating the module instance's status summary and
 * appending an audit event in the same transaction.
 *
 * Never throws for an expected domain failure (unauthorized, an unregistered
 * module version, inputs the module rejects, or a linked upstream result that
 * is stale); those come back as `{ ok: false }`. An unexpected repository error
 * still throws — that is a real bug, not a modeled outcome.
 */
export async function executeModuleInstance(
  input: ExecuteModuleInstanceInput,
): Promise<ExecuteModuleInstanceResult> {
  const context = await loadModuleInstanceForOwner(input.moduleInstanceId, input.ownerId);
  if (context === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }
  const { moduleInstance, projectId } = context;

  const pkg = getModulePackage(moduleInstance.modulePackageId, moduleInstance.moduleVersion);
  if (pkg === undefined) {
    return {
      ok: false,
      error: {
        code: "module_not_found",
        message: `Module package "${moduleInstance.modulePackageId}@${moduleInstance.moduleVersion}" is not registered.`,
      },
    };
  }

  const resolvedPorts = await resolveModuleInputs(
    input.moduleInstanceId,
    input.ownerId,
    pkg.ports.inputs.map((port) => ({
      parameterId: port.parameterId,
      ...(port.loadCase !== undefined ? { loadCase: port.loadCase } : {}),
    })),
  );
  if (resolvedPorts === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }

  const values: Record<string, EngineeringValue> = {};
  for (let i = 0; i < pkg.ports.inputs.length; i++) {
    const port = pkg.ports.inputs[i];
    const resolved = resolvedPorts[i].resolved;

    let value: EngineeringValue | undefined;
    if (resolved.source === "manual" || resolved.source === "workflow") {
      value = resolved.value;
    } else if (resolved.source === "linked") {
      if (resolved.value !== null) {
        value = resolved.value;
      } else if (resolved.link.sourceModuleInstanceId !== null) {
        const upstream = await resolveModuleOutputValue(
          resolved.link.sourceModuleInstanceId,
          resolved.link.sourceParameterId,
          resolved.link.sourceLoadCase,
          input.ownerId,
        );
        if (upstream.kind === "stale") {
          return {
            ok: false,
            error: {
              code: "stale_upstream",
              message: `Input "${port.key}" is linked to a module output whose latest calculation run is stale${upstream.staleReason === null ? "" : ` (${upstream.staleReason})`}. Re-run the upstream module before executing this one.`,
            },
          };
        }
        if (upstream.kind === "value") {
          value = upstream.value;
        }
      }
    }
    // "default": leave undefined — the SDK fills the constant default (or
    // reports a clear missing-required-input error) exactly as it would for
    // any other caller.

    if (value !== undefined) {
      values[port.key] = value;
    }
  }

  const rawInput: unknown = {
    values,
    ...(input.loadCaseId !== undefined ? { loadCaseId: input.loadCaseId } : {}),
  };

  let resolvedInput: ModuleInput;
  let computation: ModuleComputation;
  try {
    resolvedInput = resolveModuleInput(pkg, rawInput);
    computation = executeModule(pkg, rawInput);
  } catch (error) {
    if (error instanceof ModuleSdkError) {
      return { ok: false, error: { code: "invalid_input", message: error.message } };
    }
    throw error;
  }

  const snapshot: CalculationRunSnapshot = {
    snapshotVersion: RUN_SNAPSHOT_FORMAT_VERSION,
    input: resolvedInput,
    computation,
    versions: {
      engineSdkVersion: ENGINE_SDK_VERSION,
      modulePackageId: pkg.manifest.id,
      moduleVersion: pkg.manifest.version,
      modulePackageHash: pkg.manifest.contentHash,
      parameterRegistryVersion: pkg.manifest.parameterRegistryVersion,
      sourceRevisionIds: [...pkg.manifest.sourceRevisionIds],
    },
    ranAt: new Date().toISOString(),
    ranByUserId: input.ownerId,
  };

  // Run persistence, the module instance's status summary, and the audit
  // event are atomic (context/code-standards.md "Application Services").
  const run = await prisma.$transaction(async (tx) => {
    const created = await createCalculationRun(
      { moduleInstanceId: input.moduleInstanceId, snapshot },
      tx,
    );
    await updateModuleInstanceRunStatus(
      input.moduleInstanceId,
      created.id,
      created.status,
      tx,
    );
    await appendAuditEvent(
      {
        projectId,
        eventType: "calculation_run.created",
        entityType: "CalculationRun",
        entityId: created.id,
        userId: input.ownerId,
        payload: {
          moduleInstanceId: input.moduleInstanceId,
          modulePackageId: pkg.manifest.id,
          moduleVersion: pkg.manifest.version,
          status: created.status,
        },
      },
      tx,
    );
    return created;
  });

  return { ok: true, run };
}
