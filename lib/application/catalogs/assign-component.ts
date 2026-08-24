// The `assignComponent` use case (Unit 2.8 part 2) — the persistence and
// orchestration half of catalog matching and component assignment
// (context/architecture.md "lib/application/": multi-step use-case and
// transaction orchestration). It composes:
//
//   - lib/catalog — part 1's `rankCandidates`/`evaluateCandidate` help a
//     caller choose a `manufacturerPartRevisionId` *before* calling this
//     service; this service itself does not re-run matching, only persists
//     the caller's choice (context/architecture.md "Catalog and Assignment
//     UI": "Assign action creates a lightweight component assignment").
//   - lib/db — authorizes the target, cross-checks the supporting
//     calculation run and manufacturer part revision, then persists the
//     `ComponentAssignment`.
//
// A `ComponentAssignment` targets either a specific module instance (a
// "calculated component," which requires a justifying calculation run — see
// the target discriminated union below) or a bare assembly/configuration
// root (a manual/custom part with no supporting calculation, e.g. a
// bracket). `configurationId` is caller-supplied but NOT trusted: it is
// cross-checked against the configuration the target actually belongs to.
// Authorizing only the target leaves the row's `configurationId` free, so a
// caller could file an assignment for a module instance they own under a
// configuration they do not own at all — the assignment would then appear in
// that configuration's BOM and baseline snapshots.

import "server-only";
import type { ManualPartDetails } from "@/lib/catalog";
import {
  ComponentAssignmentRepositoryError,
  createComponentAssignment,
  isConfigurationOwnedBy,
  loadAssemblyForOwner,
  loadCalculationRun,
  loadManufacturerPartRevision,
  loadModuleInstanceForOwner,
  type AssemblyId,
  type CalculationRunId,
  type ComponentAssignmentPartSource,
  type ComponentAssignmentRecord,
  type MachineConfigurationId,
  type ManufacturerPartRevisionId,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";

/** What a `ComponentAssignment` is attached to — a type-safe entry point for the two `targetKind`s. */
export type AssignComponentTarget =
  | {
      readonly kind: "module_instance";
      readonly moduleInstanceId: ModuleInstanceId;
    }
  | { readonly kind: "assembly"; readonly assemblyId?: AssemblyId };

/** Input to {@link assignComponent}. */
export interface AssignComponentInput {
  readonly configurationId: MachineConfigurationId;
  readonly target: AssignComponentTarget;
  readonly partSource: ComponentAssignmentPartSource;
  readonly manufacturerPartRevisionId?: ManufacturerPartRevisionId;
  readonly manualPartDetails?: ManualPartDetails;
  readonly quantity?: number;
  /** Required when `target.kind` is `"module_instance"` (a calculated component). */
  readonly calculationRunId?: CalculationRunId;
}

/** Machine-readable classification of an `assignComponent` failure. */
export type AssignComponentErrorCode =
  "unauthorized" | "invalid_input" | "not_found";

/** A failed {@link assignComponent} outcome. */
export interface AssignComponentError {
  readonly code: AssignComponentErrorCode;
  readonly message: string;
}

/**
 * Result of {@link assignComponent} — a discriminated success/error result
 * (context/code-standards.md "Prefer discriminated unions ... for result
 * states"), not a throw, so a route handler renders any outcome without a
 * try/catch for expected domain failures.
 */
export type AssignComponentResult =
  | { readonly ok: true; readonly assignment: ComponentAssignmentRecord }
  | { readonly ok: false; readonly error: AssignComponentError };

function unauthorized(message: string): AssignComponentResult {
  return { ok: false, error: { code: "unauthorized", message } };
}
function notFound(message: string): AssignComponentResult {
  return { ok: false, error: { code: "not_found", message } };
}
function invalid(message: string): AssignComponentResult {
  return { ok: false, error: { code: "invalid_input", message } };
}

/**
 * Assigns a manufacturer catalog part or a manual/custom part to a target
 * (a module instance's calculated requirement, or a bare
 * assembly/configuration root), scoped to `ownerId`:
 *
 * 1. Authorizes the target — the owning module instance, the named assembly,
 *    or (for a configuration-root target) the configuration itself — and
 *    confirms the target really belongs to `input.configurationId`.
 * 2. When `calculationRunId` is given, verifies it exists, is owned by
 *    `ownerId`, actually belongs to the target module instance, and is not
 *    stale — "Exact part revision retained" only means something if the
 *    justifying run is real, relevant, and still current.
 * 3. When `partSource` is `"catalog"`, verifies the manufacturer part
 *    revision exists (shared reference data — no owner check, per Unit 2.6).
 * 4. Persists the `ComponentAssignment`.
 *
 * Never throws for an expected domain failure (unauthorized, not found, or a
 * malformed input the repository's Zod validation rejects) — an unexpected
 * repository error still throws, since that is a real bug, not a modeled
 * outcome.
 */
export async function assignComponent(
  input: AssignComponentInput,
  ownerId: UserId,
): Promise<AssignComponentResult> {
  if (input.target.kind === "module_instance") {
    const context = await loadModuleInstanceForOwner(
      input.target.moduleInstanceId,
      ownerId,
    );
    if (context === null) {
      return unauthorized(
        "Module instance not found or not owned by this user.",
      );
    }
    if (context.configurationId !== input.configurationId) {
      return unauthorized(
        "Module instance does not belong to the given configuration.",
      );
    }
  } else if (input.target.assemblyId !== undefined) {
    const assembly = await loadAssemblyForOwner(
      input.target.assemblyId,
      ownerId,
    );
    if (assembly === null) {
      return unauthorized("Assembly not found or not owned by this user.");
    }
    if (assembly.configurationId !== input.configurationId) {
      return unauthorized(
        "Assembly does not belong to the given configuration.",
      );
    }
  } else {
    const owned = await isConfigurationOwnedBy(input.configurationId, ownerId);
    if (!owned) {
      return unauthorized("Configuration not found or not owned by this user.");
    }
  }

  if (input.calculationRunId !== undefined) {
    if (input.target.kind !== "module_instance") {
      return invalid(
        "calculationRunId is only meaningful for a module_instance target.",
      );
    }
    const run = await loadCalculationRun(input.calculationRunId, ownerId);
    if (run === null) {
      return notFound("Calculation run not found or not owned by this user.");
    }
    if (run.moduleInstanceId !== input.target.moduleInstanceId) {
      return invalid(
        "calculationRunId does not belong to the target module instance.",
      );
    }
    if (run.stale) {
      return invalid(
        `Calculation run is stale${run.staleReason === null ? "" : ` (${run.staleReason})`} — re-run the module before assigning a component against it.`,
      );
    }
  }

  if (
    input.partSource === "catalog" &&
    input.manufacturerPartRevisionId !== undefined
  ) {
    const part = await loadManufacturerPartRevision(
      input.manufacturerPartRevisionId,
    );
    if (part === null) {
      return notFound(
        `Manufacturer part revision "${input.manufacturerPartRevisionId}" does not exist.`,
      );
    }
  }

  try {
    const assignment = await createComponentAssignment({
      configurationId: input.configurationId,
      targetKind: input.target.kind,
      ...(input.target.kind === "module_instance"
        ? { moduleInstanceId: input.target.moduleInstanceId }
        : input.target.assemblyId !== undefined
          ? { assemblyId: input.target.assemblyId }
          : {}),
      partSource: input.partSource,
      ...(input.manufacturerPartRevisionId !== undefined
        ? { manufacturerPartRevisionId: input.manufacturerPartRevisionId }
        : {}),
      ...(input.manualPartDetails !== undefined
        ? { manualPartDetails: input.manualPartDetails }
        : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.calculationRunId !== undefined
        ? { calculationRunId: input.calculationRunId }
        : {}),
      assignedByUserId: ownerId,
    });
    return { ok: true, assignment };
  } catch (error) {
    if (error instanceof ComponentAssignmentRepositoryError) {
      return invalid(error.message);
    }
    throw error;
  }
}
