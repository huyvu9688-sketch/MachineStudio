// Domain-facing contracts for the ComponentAssignment repository (Unit 2.8
// part 2; context/architecture.md "Catalog and BOM": `ComponentAssignment`).
//
// Unlike the shared-reference catalog repository (Unit 2.6), this model IS
// project-scoped: "ComponentAssignment (Unit 2.8) is where a specific
// project links to a specific catalog part revision — ownership/scoping
// enters there, not in the catalog tables themselves" (Unit 2.6 architecture
// decision, context/progress-tracker.md).

import type { ManualPartDetails } from "../../catalog";
import type { ManufacturerPartRevisionId } from "./catalog-types";
import type { CalculationRunId } from "./run-types";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "./types";

/** A `ComponentAssignment` ID. */
export type ComponentAssignmentId = string & {
  readonly __brand: "ComponentAssignmentId";
};
/** Casts a raw string to a {@link ComponentAssignmentId}. Identity at runtime. */
export function asComponentAssignmentId(id: string): ComponentAssignmentId {
  return id as ComponentAssignmentId;
}

/**
 * What a `ComponentAssignment` is attached to. Mirrors `ParameterLink`'s
 * `sourceKind` discriminator-plus-nullable-columns pattern.
 */
export type ComponentAssignmentTargetKind = "module_instance" | "assembly";

/** How a `ComponentAssignment`'s part is identified. Mirrors `ComponentReference.source`. */
export type ComponentAssignmentPartSource = "catalog" | "manual";

/** A persisted `ComponentAssignment` row, its `manualPartDetails` validated on read. */
export interface ComponentAssignmentRecord {
  readonly id: ComponentAssignmentId;
  readonly configurationId: MachineConfigurationId;
  readonly targetKind: ComponentAssignmentTargetKind;
  readonly moduleInstanceId: ModuleInstanceId | null;
  readonly assemblyId: AssemblyId | null;
  readonly partSource: ComponentAssignmentPartSource;
  readonly manufacturerPartRevisionId: ManufacturerPartRevisionId | null;
  readonly manualPartDetails: ManualPartDetails | null;
  readonly quantity: number;
  readonly calculationRunId: CalculationRunId | null;
  readonly stale: boolean;
  readonly staleReason: string | null;
  readonly assignedByUserId: UserId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input to create a `ComponentAssignment`. Exactly one of `moduleInstanceId`/
 * `assemblyId` may be set, matching `targetKind`; exactly one of
 * `manufacturerPartRevisionId`/`manualPartDetails` may be set, matching
 * `partSource`; `calculationRunId` is required when `targetKind` is
 * `"module_instance"` — all enforced by the repository's Zod validation, not
 * TypeScript alone (the application layer's `AssignComponentInput`, a
 * discriminated union, is the type-safe entry point that builds this shape).
 */
export interface CreateComponentAssignmentInput {
  readonly configurationId: MachineConfigurationId;
  readonly targetKind: ComponentAssignmentTargetKind;
  readonly moduleInstanceId?: ModuleInstanceId;
  readonly assemblyId?: AssemblyId;
  readonly partSource: ComponentAssignmentPartSource;
  readonly manufacturerPartRevisionId?: ManufacturerPartRevisionId;
  readonly manualPartDetails?: ManualPartDetails;
  readonly quantity?: number;
  readonly calculationRunId?: CalculationRunId;
  readonly assignedByUserId?: UserId;
}
