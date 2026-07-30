// lib/configuration owns draft configurations, immutable baselines, baseline
// comparison, and release labels (context/architecture.md "lib/configuration/").
// A full multi-user approval workflow is deferred. Unit 2.9 part 1 delivers
// the pure snapshot contract, creation-readiness checks, and comparison — all
// DB-free; persistence (`MachineBaseline` schema + repository) and
// orchestration (`createBaseline`/`compareBaselines`) live in lib/db and
// lib/application (Unit 2.9 part 2).

export type {
  BaselineAcceptanceCriterion,
  BaselineAssemblyNode,
  BaselineCalculationRunRef,
  BaselineComponentAssignment,
  BaselineComponentAssignmentPartSource,
  BaselineComponentAssignmentTargetKind,
  BaselineDesignAssumption,
  BaselineLoadCase,
  BaselineModuleInstance,
  BaselineParameterLink,
  BaselineParameterValue,
  BaselineParameterValueSource,
  BaselineRequirement,
  BaselineSnapshotFormatVersion,
  MachineBaselineSnapshot,
} from "./types";
export { BASELINE_SNAPSHOT_FORMAT_VERSION } from "./types";

export { MachineBaselineSnapshotSchema, safeParseMachineBaselineSnapshot } from "./schemas";

export type {
  BaselineBlocker,
  BaselineBlockerKind,
  BaselineReadinessInput,
  BaselineReadinessResult,
} from "./readiness";
export { evaluateBaselineReadiness } from "./readiness";

export type {
  BaselineAssemblySummary,
  BaselineChange,
  BaselineComparison,
  BaselineListDiff,
  BaselineModuleInstanceSummary,
} from "./comparison";
export { compareBaselineSnapshots } from "./comparison";
