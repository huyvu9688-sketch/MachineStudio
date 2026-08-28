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
// pulled from the source module's latest run via the imported
// `resolveModuleOutputValue` (refusing with `stale_upstream` if that run is
// stale, identical wording to `executeModuleInstance`'s own message);
// "default" is left unresolved for the SDK to fill its constant default or
// report a clear missing-required-input error. `resolveModuleOutputValue`
// is exported from `execute-module-instance.ts` (which otherwise stays
// unchanged — Non-goal) and reused here as-is: it already takes its
// `DbClient` as a parameter, so it is not actually coupled to a transaction
// — this use case simply passes the plain `prisma` client instead of a
// `tx`, since it never opens a transaction (nothing it reads is written
// back).
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
import { resolveModuleOutputValue } from "./execute-module-instance";

export interface PreviewModuleComputationInput {
  readonly moduleInstanceId: ModuleInstanceId;
  readonly ownerId: UserId;
  readonly overrides: Readonly<Record<string, EngineeringValue>>;
}

export type PreviewModuleComputationErrorCode =
  | "unauthorized"
  | "module_not_found"
  | "invalid_input"
  | "stale_upstream";

export interface PreviewModuleComputationError {
  readonly code: PreviewModuleComputationErrorCode;
  readonly message: string;
}

export interface ModulePreviewView {
  readonly outputs: readonly PortValueView[];
  readonly checks: readonly CheckResult[];
  readonly warnings: readonly Warning[];
  readonly validity: readonly ValidityResult[];
  readonly trace: CalculationTrace | null;
  readonly sources: readonly SourceReferenceView[];
}

export type PreviewModuleComputationResult =
  | { readonly ok: true; readonly preview: ModulePreviewView }
  | { readonly ok: false; readonly error: PreviewModuleComputationError };

/**
 * Computes a module instance's result from its currently-resolved inputs —
 * with `input.overrides` applied on top of any non-linked port — without
 * persisting anything. Never opens a transaction: nothing it reads is
 * written back, so there is no multi-read consistency window to protect
 * (contrast `executeModuleInstance`'s `RepeatableRead` transaction, which
 * exists solely to keep its read-then-persist sequence atomic).
 *
 * Never throws for an expected domain failure (unauthorized, an
 * unregistered module version, inputs the module rejects, or a linked
 * upstream result that is stale); those come back as `{ ok: false }`. An
 * unexpected repository error still throws.
 */
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
