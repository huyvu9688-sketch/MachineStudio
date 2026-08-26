// Barrel for the project-hierarchy use cases (Unit 3.1 read path; Unit 3.2
// create/rename/add-module writes).

export { loadWorkspaceView, type WorkspaceView } from "./load-workspace-view";

export {
  createMachineProject,
  INITIAL_CONFIGURATION_NAME,
  type CreateMachineProjectInput,
  type CreateMachineProjectResult,
  type CreateMachineProjectError,
  type CreateMachineProjectErrorCode,
} from "./create-project";

export {
  renameMachineProject,
  type RenameMachineProjectResult,
  type RenameMachineProjectError,
  type RenameMachineProjectErrorCode,
} from "./rename-project";

export {
  createMachineAssembly,
  renameMachineAssembly,
  type CreateMachineAssemblyInput,
  type CreateMachineAssemblyResult,
  type RenameMachineAssemblyResult,
  type ManageAssemblyError,
  type ManageAssemblyErrorCode,
} from "./manage-assemblies";

export {
  addModuleInstance,
  type AddModuleInstanceInput,
  type AddModuleInstanceResult,
  type AddModuleInstanceError,
  type AddModuleInstanceErrorCode,
} from "./add-module-instance";

export {
  renameModuleInstanceLabel,
  archiveModuleInstance,
  previewArchiveModuleInstanceImpact,
  deleteModuleInstance,
  previewDeleteModuleInstanceImpact,
  type ManageModuleInstanceErrorCode,
  type ManageModuleInstanceError,
  type RenameModuleInstanceResult,
  type ArchiveModuleInstanceResult,
  type ArchiveModuleInstanceImpactPreview,
  type PreviewArchiveModuleInstanceImpactResult,
  type DeleteModuleInstanceResult,
} from "./manage-module-instances";
