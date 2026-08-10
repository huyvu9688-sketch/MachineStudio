// Barrel for lib/application/workflows (Unit 4.9): starting and reading a
// guided WorkflowInstance's state.

export {
  startWorkflowInstance,
  type StartWorkflowInstanceInput,
  type StartWorkflowInstanceResult,
  type StartWorkflowInstanceError,
  type StartWorkflowInstanceErrorCode,
} from "./start-workflow-instance";

export {
  loadWorkflowInstanceView,
  type WorkflowInstanceView,
  type ExcludedModuleInstanceView,
  type LoadWorkflowInstanceViewResult,
  type LoadWorkflowInstanceViewError,
  type LoadWorkflowInstanceViewErrorCode,
} from "./load-workflow-instance-view";
