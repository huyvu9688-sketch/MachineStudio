// lib/application owns use-case and transaction orchestration
// (context/architecture.md "lib/application/"). Route handlers call these
// services; business transactions do not live in route handlers, React
// components, or raw database query files.

export {
  executeModuleInstance,
  type ExecuteModuleInstanceInput,
  type ExecuteModuleInstanceError,
  type ExecuteModuleInstanceErrorCode,
  type ExecuteModuleInstanceResult,
} from "./calculations/execute-module-instance";

export {
  setParameterValue,
  confirmParameterLink,
  removeParameterLink,
  type SetParameterValueResult,
  type ConfirmParameterLinkResult,
  type RemoveParameterLinkResult,
  type StalePropagationError,
  type StalePropagationErrorCode,
} from "./parameters";

export {
  importCatalog,
  type ImportCatalogInput,
  type ImportCatalogResult,
  type ImportCatalogDryRunResult,
  type ImportCatalogAppliedResult,
  type ImportCatalogRowOutcome,
  type ImportCatalogError,
  type ImportCatalogErrorCode,
} from "./catalogs/import-catalog";

export {
  assignComponent,
  type AssignComponentTarget,
  type AssignComponentInput,
  type AssignComponentResult,
  type AssignComponentError,
  type AssignComponentErrorCode,
} from "./catalogs/assign-component";

export {
  createBaseline,
  type CreateBaselineInput,
  type CreateBaselineResult,
  type CreateBaselineError,
  type CreateBaselineErrorCode,
} from "./configurations/create-baseline";

export {
  compareBaselines,
  type CompareBaselinesResult,
  type CompareBaselinesError,
  type CompareBaselinesErrorCode,
} from "./configurations/compare-baselines";
