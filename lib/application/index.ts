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
  loadModuleWorkspaceView,
  type ModuleWorkspaceView,
  type ModuleWorkspaceModuleSummary,
  type ModuleInputGroupView,
  type ModuleInputFieldView,
  type ModuleInputFieldDescriptor,
} from "./calculations/load-module-workspace-view";

export {
  loadModuleResultView,
  type ModuleResultView,
  type ModuleResultRunSummary,
  type RunOutputView,
  type SourceReferenceView,
  type ChangedOutputView,
  type ChangedCheckView,
  type RunComparisonView,
} from "./calculations/load-module-result-view";

export {
  setParameterValue,
  confirmParameterLink,
  removeParameterLink,
  previewRemoveParameterLinkImpact,
  type SetParameterValueResult,
  type ConfirmParameterLinkResult,
  type RemoveParameterLinkResult,
  type PreviewRemoveParameterLinkImpactResult,
  type StalePropagationError,
  type StalePropagationErrorCode,
  buildConfigurationSuggestionIndex,
  describeLinkSuggestions,
  MAX_LINK_SUGGESTIONS_PER_FIELD,
  type ConfigurationSuggestionIndex,
  type LinkSuggestionSourceView,
  type LinkSuggestionSourceKind,
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
  loadComponentAssignmentView,
  type ComponentAssignmentPanelView,
  type ComponentAssignmentView,
  type CandidatePartView,
  type RankedCandidateView,
  type RejectedCandidateView,
} from "./catalogs/load-component-assignment-view";

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

export {
  loadBaselineWorkspaceView,
  type BaselineListItemView,
  type BaselineOutputChangeView,
  type BaselineCheckChangeView,
  type BaselineRunDetailUnavailableView,
  type BaselineComparisonView,
  type BaselineWorkspaceView,
} from "./configurations/load-baseline-workspace-view";

export {
  loadWorkspaceView,
  type WorkspaceView,
  createMachineProject,
  INITIAL_CONFIGURATION_NAME,
  type CreateMachineProjectInput,
  type CreateMachineProjectResult,
  type CreateMachineProjectError,
  type CreateMachineProjectErrorCode,
  renameMachineProject,
  type RenameMachineProjectResult,
  type RenameMachineProjectError,
  type RenameMachineProjectErrorCode,
  createMachineAssembly,
  renameMachineAssembly,
  type CreateMachineAssemblyInput,
  type CreateMachineAssemblyResult,
  type RenameMachineAssemblyResult,
  type ManageAssemblyError,
  type ManageAssemblyErrorCode,
  addModuleInstance,
  type AddModuleInstanceInput,
  type AddModuleInstanceResult,
  type AddModuleInstanceError,
  type AddModuleInstanceErrorCode,
  renameModuleInstanceLabel,
  archiveModuleInstance,
  previewArchiveModuleInstanceImpact,
  type ManageModuleInstanceErrorCode,
  type ManageModuleInstanceError,
  type RenameModuleInstanceResult,
  type ArchiveModuleInstanceResult,
  type ArchiveModuleInstanceImpactPreview,
  type PreviewArchiveModuleInstanceImpactResult,
} from "./projects";

export {
  createMachineRequirement,
  createRequirementAcceptanceCriterion,
  type CreateMachineRequirementInput,
  type CreateMachineRequirementResult,
  type CreateRequirementAcceptanceCriterionInput,
  type CreateRequirementAcceptanceCriterionResult,
  type ManageRequirementsError,
  type ManageRequirementsErrorCode,
  createMachineLoadCase,
  type CreateMachineLoadCaseInput,
  type CreateMachineLoadCaseResult,
  type ManageLoadCasesError,
  type ManageLoadCasesErrorCode,
  createMachineDesignAssumption,
  type CreateMachineDesignAssumptionInput,
  type CreateMachineDesignAssumptionResult,
  type ManageDesignAssumptionsError,
  type ManageDesignAssumptionsErrorCode,
  loadRequirementsView,
  type RequirementsView,
  type RequirementView,
  type RequirementVerificationStatus,
} from "./requirements";

export {
  startWorkflowInstance,
  type StartWorkflowInstanceInput,
  type StartWorkflowInstanceResult,
  type StartWorkflowInstanceError,
  type StartWorkflowInstanceErrorCode,
  loadWorkflowInstanceView,
  type WorkflowInstanceView,
  type ExcludedModuleInstanceView,
  type LoadWorkflowInstanceViewResult,
  type LoadWorkflowInstanceViewError,
  type LoadWorkflowInstanceViewErrorCode,
} from "./workflows";

export {
  loadBomView,
  type BomItem,
  type BomNode,
  type BomView,
  loadModuleReportView,
  type ModuleReportView,
  type ModuleReportRunView,
  type AssumptionView,
  type ReportLoadCaseView,
  type ReportAssignedPartView,
  type PortValueView,
  loadAssemblyReportView,
  type AssemblyReportView,
  type AssemblyReportNode,
  loadMachineReportView,
  type MachineReportView,
  type MachineReportMarketProfileView,
  type MachineReportMarketProfileEntryView,
  type OpenWarningView,
  type OpenAssumptionView,
  type MachineReportBaselineView,
  type MachineReportBaselineModuleRef,
} from "./reports";

export {
  exportAccountData,
  type AccountDataExport,
  type ExportedProjectData,
  type ExportedConfigurationData,
  type ExportedModuleInstanceRuns,
  type ExportedCalculationRun,
  deleteAccount,
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  type DeleteAccountResult,
  type DeleteAccountError,
  type DeleteAccountErrorCode,
} from "./account";
