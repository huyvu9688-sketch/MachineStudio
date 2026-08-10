// Barrel for lib/db persistence adapters (repositories). These are the
// ownership-scoped, single-aggregate read/write interfaces the application
// layer (lib/application, Unit 2.4+) depends on. lib/db is the only boundary
// that imports Prisma (context/architecture.md "lib/db/").

export * from "./types";
export type { DbClient } from "./db-client";
export {
  ProjectRepositoryError,
  upsertUser,
  createProject,
  createConfiguration,
  createAssembly,
  createModuleInstance,
  listProjectsByOwner,
  loadProjectTree,
  deleteProject,
  renameProject,
  renameAssembly,
  loadModuleInstanceForOwner,
  updateModuleInstanceRunStatus,
  isConfigurationOwnedBy,
  loadAssemblyForOwner,
  loadConfigurationForOwner,
  loadConfigurationTree,
} from "./project-repository";
export type { ProjectRepositoryErrorCode } from "./project-repository";

// Workflow instances (Unit 4.9).
export {
  WorkflowRepositoryError,
  createWorkflowInstance,
  loadWorkflowInstanceForOwner,
  listModuleInstancesForWorkflowInstance,
  updateWorkflowInstanceStatus,
} from "./workflow-repository";
export type { WorkflowRepositoryErrorCode } from "./workflow-repository";

// Requirements and parameter graph (Unit 2.2).
export * from "./requirements-types";
export * from "./graph-types";
export {
  RequirementsRepositoryError,
  createRequirement,
  createAcceptanceCriterion,
  createDesignAssumption,
  createLoadCase,
  listRequirements,
  listDesignAssumptions,
  listLoadCases,
  loadRequirementForOwner,
} from "./requirements-repository";
export type { RequirementsRepositoryErrorCode } from "./requirements-repository";
export {
  GraphRepositoryError,
  createParameterValue,
  createParameterLink,
  resolveModuleInputs,
  loadConfigurationGraph,
  parameterGraphNodeId,
  loadParameterLinkForOwner,
  deleteParameterLink,
  listParameterLinksForConfiguration,
  listCurrentParameterValuesForConfiguration,
  findCurrentParameterValueForNode,
} from "./graph-repository";
export type {
  GraphRepositoryErrorCode,
  GraphNodeDescriptor,
} from "./graph-repository";

// Immutable calculation runs (Unit 2.3).
export * from "./run-types";
export {
  CalculationRunSnapshotSchema,
  safeParseRunSnapshot,
} from "./run-snapshot";
export {
  RunRepositoryError,
  createCalculationRun,
  loadCalculationRun,
  listRunsForModuleInstance,
  markRunStale,
  markRunsStaleForModuleInstances,
} from "./run-repository";
export type { RunRepositoryErrorCode } from "./run-repository";

// Append-only audit events (Unit 2.4; query surface Unit 2.9).
export * from "./audit-types";
export {
  AuditRepositoryError,
  appendAuditEvent,
  listAuditEventsForProject,
} from "./audit-repository";
export type { AuditRepositoryErrorCode } from "./audit-repository";

// Manufacturer catalog (Unit 2.6; upsert + import-batch summary Unit 2.7 part 2).
export * from "./catalog-types";
export {
  CatalogRepositoryError,
  createManufacturer,
  createComponentType,
  createComponentSchemaVersion,
  createCatalogImportBatch,
  createManufacturerPartRevision,
  upsertManufacturerPartRevision,
  createDatasheetAttachment,
  loadManufacturer,
  loadCatalogImportBatch,
  loadComponentSchemaVersion,
  loadManufacturerPartRevision,
  listManufacturerPartRevisionsByComponentType,
} from "./catalog-repository";
export type { CatalogRepositoryErrorCode } from "./catalog-repository";

// Component assignment (Unit 2.8 part 2).
export * from "./component-assignment-types";
export {
  ComponentAssignmentRepositoryError,
  createComponentAssignment,
  loadComponentAssignmentForOwner,
  listComponentAssignmentsForConfiguration,
  listComponentAssignmentsForModuleInstance,
  markComponentAssignmentsStaleForModuleInstances,
} from "./component-assignment-repository";
export type { ComponentAssignmentRepositoryErrorCode } from "./component-assignment-repository";

// Machine baselines (Unit 2.9 part 2).
export * from "./baseline-types";
export {
  BaselineRepositoryError,
  createMachineBaseline,
  loadMachineBaseline,
  listMachineBaselinesForConfiguration,
} from "./baseline-repository";
export type { BaselineRepositoryErrorCode } from "./baseline-repository";
