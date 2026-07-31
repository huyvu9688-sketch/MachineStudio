// Barrel for the requirements/assumptions/load-case use cases (Unit 3.7).

export {
  createMachineRequirement,
  createRequirementAcceptanceCriterion,
  type CreateMachineRequirementInput,
  type CreateMachineRequirementResult,
  type CreateRequirementAcceptanceCriterionInput,
  type CreateRequirementAcceptanceCriterionResult,
  type ManageRequirementsError,
  type ManageRequirementsErrorCode,
} from "./manage-requirements";

export {
  createMachineLoadCase,
  type CreateMachineLoadCaseInput,
  type CreateMachineLoadCaseResult,
  type ManageLoadCasesError,
  type ManageLoadCasesErrorCode,
} from "./manage-load-cases";

export {
  createMachineDesignAssumption,
  type CreateMachineDesignAssumptionInput,
  type CreateMachineDesignAssumptionResult,
  type ManageDesignAssumptionsError,
  type ManageDesignAssumptionsErrorCode,
} from "./manage-design-assumptions";

export {
  loadRequirementsView,
  type RequirementsView,
  type RequirementView,
  type RequirementVerificationStatus,
} from "./load-requirements-view";
