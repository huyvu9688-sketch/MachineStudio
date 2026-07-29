// Barrel for lib/db persistence adapters (repositories). These are the
// ownership-scoped, single-aggregate read/write interfaces the application
// layer (lib/application, Unit 2.4+) depends on. lib/db is the only boundary
// that imports Prisma (context/architecture.md "lib/db/").

export * from "./types";
export {
  ProjectRepositoryError,
  upsertUser,
  createProject,
  createConfiguration,
  createAssembly,
  createWorkflowInstance,
  createModuleInstance,
  listProjectsByOwner,
  loadProjectTree,
  deleteProject,
} from "./project-repository";
export type { ProjectRepositoryErrorCode } from "./project-repository";

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
} from "./requirements-repository";
export type { RequirementsRepositoryErrorCode } from "./requirements-repository";
export {
  GraphRepositoryError,
  createParameterValue,
  createParameterLink,
  resolveModuleInputs,
} from "./graph-repository";
export type { GraphRepositoryErrorCode } from "./graph-repository";

// Immutable calculation runs (Unit 2.3).
export * from "./run-types";
export { CalculationRunSnapshotSchema, safeParseRunSnapshot } from "./run-snapshot";
export {
  RunRepositoryError,
  createCalculationRun,
  loadCalculationRun,
  listRunsForModuleInstance,
  markRunStale,
} from "./run-repository";
export type { RunRepositoryErrorCode } from "./run-repository";
