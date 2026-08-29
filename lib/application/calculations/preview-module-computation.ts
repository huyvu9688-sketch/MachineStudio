// The `previewModuleComputation` use case (module workspace save/run
// redesign, 2026-08-27, docs/superpowers/specs/
// 2026-08-27-module-workspace-save-run-redesign-design.md). Computes a
// module instance's result from its currently-resolved inputs — with the
// caller's submitted field overrides applied on top — WITHOUT persisting
// anything: no `ParameterValue`, no `CalculationRun`, no audit event. Safe
// to call repeatedly while the caller tries different combinations before
// committing to `saveModuleInputsAction`.
//
// Mirrors `executeModuleInstance`'s (Unit 2.4) input-resolution loop
// exactly: a manual/workflow value resolves as authored; a linked value is
// pulled from the source module's latest run via `resolveModuleOutputValue`
// (refusing with `stale_upstream` if that run is stale, identical wording to
// `executeModuleInstance`'s own message); "default" is left unresolved for
// the SDK to fill its constant default or report a clear missing-required-
// input error. The loop is duplicated here rather than shared with
// `execute-module-instance.ts`, which stays unchanged (Non-goal) and runs
// its own version inside a `RepeatableRead` transaction this use case
// deliberately never opens.
//
// The only real difference from executeModuleInstance's loop: for any port
// whose resolved source is NOT "linked", a value present in `overrides`
// replaces the resolved one before `executeModule` ever sees it. A linked
// port's override (if the client somehow sent one) is always ignored — the
// honest client never renders a control for a linked field in the first
// place, but resolution order stays authoritative here too, matching every
// other "never trust the client alone" boundary in this codebase (e.g.
// `setModuleInputValueAction`'s canonical-unit/enum/frame re-derivation).

import "server-only";
import {
  ModuleSdkError,
  executeModule,
  type CalculationTrace,
  type CheckResult,
  type EngineeringValue,
  type ModuleComputation,
  type ValidityResult,
  type Warning,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  loadModuleInstanceForOwner,
  prisma,
  resolveModuleInputs,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";
import {
  collectClauseReferences,
  describePortValues,
  resolveSourceReferences,
  type PortValueView,
  type SourceReferenceView,
} from "./run-view-helpers";
import { resolveModuleOutputValue } from "./resolve-module-output-value";

/**
 * Input to {@link previewModuleComputation}. Deliberately has no
 * `loadCaseId` field, unlike `ExecuteModuleInstanceInput` — the generic
 * module workspace's Run button never collects one today (its own
 * `runModuleInstanceAction` predecessor never passed one either), so this is
 * a documented gap, not an oversight: a future load-case selector on Run
 * would need to thread a `loadCaseId` through here too, or preview and the
 * persisted run could silently diverge for a load-case-aware module.
 */
export interface PreviewModuleComputationInput {
  readonly moduleInstanceId: ModuleInstanceId;
  readonly ownerId: UserId;
  /** Submitted client values, keyed by port key — applied only to a port whose resolved source is not "linked". */
  readonly overrides: Readonly<Record<string, EngineeringValue>>;
}

/** Machine-readable classification of a `previewModuleComputation` failure — mirrors `ExecuteModuleInstanceErrorCode`. */
export type PreviewModuleComputationErrorCode =
  | "unauthorized"
  | "module_not_found"
  | "invalid_input"
  | "stale_upstream";

/** A failed {@link previewModuleComputation} outcome. */
export interface PreviewModuleComputationError {
  readonly code: PreviewModuleComputationErrorCode;
  readonly message: string;
}

/**
 * The unpersisted computation, described for display — the same field
 * shapes `ModuleResultView`'s (`./load-module-result-view.ts`) own described
 * fields use (`RunOutputView` there is a type alias of `PortValueView` here),
 * so `ModuleResultPanel` can render either with one set of sub-renderers.
 */
export interface ModulePreviewView {
  readonly outputs: readonly PortValueView[];
  readonly checks: readonly CheckResult[];
  readonly warnings: readonly Warning[];
  readonly validity: readonly ValidityResult[];
  readonly trace: CalculationTrace | null;
  readonly sources: readonly SourceReferenceView[];
}

/** Result of {@link previewModuleComputation}. */
export type PreviewModuleComputationResult =
  | { readonly ok: true; readonly preview: ModulePreviewView }
  | { readonly ok: false; readonly error: PreviewModuleComputationError };

export async function previewModuleComputation(
  input: PreviewModuleComputationInput,
): Promise<PreviewModuleComputationResult> {
  const context = await loadModuleInstanceForOwner(
    input.moduleInstanceId,
    input.ownerId,
  );
  if (context === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }
  const { moduleInstance } = context;

  const pkg = getModulePackage(
    moduleInstance.modulePackageId,
    moduleInstance.moduleVersion,
  );
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
    const override = input.overrides[port.key];

    if (override !== undefined && resolved.source !== "linked") {
      values[port.key] = override;
      continue;
    }

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
          prisma,
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
    // "default": leave undefined -- the SDK fills the constant default (or
    // reports a clear missing-required-input error) exactly as it would for
    // any other caller.

    if (value !== undefined) {
      values[port.key] = value;
    }
  }

  const rawInput: unknown = { values };

  let computation: ModuleComputation;
  try {
    computation = executeModule(pkg, rawInput);
  } catch (error) {
    if (error instanceof ModuleSdkError) {
      return {
        ok: false,
        error: { code: "invalid_input", message: error.message },
      };
    }
    throw error;
  }

  return {
    ok: true,
    preview: {
      outputs: describePortValues(computation.outputs, pkg.ports.outputs),
      checks: computation.checks,
      warnings: computation.warnings,
      validity: computation.validity,
      trace: computation.trace,
      sources: resolveSourceReferences(collectClauseReferences(computation)),
    },
  };
}
