// Public surface of the calculation trace and check contracts (Unit 1.5).
// Modules emit these records from their compute path; reports and the result
// pane render them without importing module compute code. The compile-time
// parity guard in ./schemas is intentionally not re-exported.

export { TRACE_FORMAT_VERSION } from "./format";
export type { TraceFormatVersion } from "./format";

export type {
  TraceOperand,
  TraceNode,
  TraceNodeKind,
  TraceStep,
  TraceSection,
  CalculationTrace,
  CheckStatus,
  CheckResult,
  Warning,
  ValidityStatus,
  ValidityResult,
} from "./types";

export {
  TraceOperandSchema,
  TraceStepSchema,
  TraceSectionSchema,
  TraceNodeSchema,
  CalculationTraceSchema,
  CheckResultSchema,
  WarningSchema,
  ValidityResultSchema,
  parseCalculationTrace,
  safeParseCalculationTrace,
  parseCheckResult,
  parseWarning,
  parseValidityResult,
} from "./schemas";

export { TraceError, type TraceErrorCode } from "./errors";

export type { TraceVisitor } from "./trace";
export {
  walkTrace,
  traceStepIds,
  validateCalculationTrace,
  buildCalculationTrace,
  serializeCalculationTrace,
  deserializeCalculationTrace,
} from "./trace";

export { overallCheckStatus, isBlockingStatus } from "./checks";
