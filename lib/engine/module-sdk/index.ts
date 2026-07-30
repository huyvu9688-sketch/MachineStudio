// Public surface of the module SDK v1 (Unit 1.6). Module packages are authored
// against these contracts and executed through `executeModule`; the engine never
// imports a module's internals. The compile-time parity guard in ./schemas is
// intentionally not re-exported.

export {
  ENGINE_SDK_VERSION,
  parseSemver,
  compareSemver,
  isValidSemver,
  isValidSdkRange,
  isSdkCompatible,
} from "./sdk";
export type { SdkRange } from "./sdk";

export type {
  ModuleReplacement,
  ModuleManifest,
  ModuleInputPort,
  ModuleOutputPort,
  ModulePorts,
  ModuleInput,
  Assumption,
  ModuleComputation,
  ModuleUiField,
  ModuleUiGroup,
  ModuleUiSchema,
  ReportSectionKind,
  ModuleReportSection,
  ModuleReportSchema,
  ReferenceExample,
  ValidationRecord,
  CatalogAdapter,
  ModulePackage,
  ModulePackageDraft,
} from "./types";

export {
  SdkRangeSchema,
  ModuleReplacementSchema,
  ModuleManifestSchema,
  ModuleInputPortSchema,
  ModuleOutputPortSchema,
  ModulePortsSchema,
  ModuleUiFieldSchema,
  ModuleUiGroupSchema,
  ModuleUiSchemaSchema,
  ModuleReportSectionSchema,
  ModuleReportSchemaSchema,
  ReferenceExampleSchema,
  ValidationRecordSchema,
  AssumptionSchema,
  ModuleInputSchema,
  ModuleComputationSchema,
  parseModuleInput,
  parseModuleComputation,
} from "./schemas";

export { ModuleSdkError, type ModuleSdkErrorCode } from "./errors";

export { packageContentHash, sealModulePackage, moduleSourceHash } from "./hash";
export { validateModulePackage } from "./validate";
export {
  executeModule,
  resolveModuleInput,
  computeIsDeterministic,
  type ExecuteOptions,
} from "./execute";

// Unit 1.7 — module conformance suite, scaffolder, and registry codegen.
export {
  runModuleConformance,
  checkImportBoundary,
  type ConformanceStatus,
  type ConformanceCheck,
  type ConformanceReport,
  type ConformanceOptions,
  type ModuleSourceFile,
  type ImportBoundaryViolation,
} from "./conformance";
export {
  generateModuleScaffold,
  type ScaffoldOptions,
  type ScaffoldResult,
  type ScaffoldFile,
} from "./scaffold";
export {
  generateRegistrySource,
  moduleRegistryKey,
  type RegistryModuleEntry,
} from "./registry-codegen";
