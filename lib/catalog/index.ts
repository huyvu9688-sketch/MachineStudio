// lib/catalog owns manufacturer part specifications and deterministic
// matching: component-type schemas, manufacturer part revision
// validation, CSV import mapping, hard filters and transparent ranking,
// compatibility rules, and required-spec output. There is no
// company-approved-part layer in the MVP. See context/architecture.md.
//
// Unit 2.6 delivers the component-type attribute schema contracts;
// persistence lives in lib/db/repositories/catalog-repository.ts, the only
// boundary allowed to import Prisma. Unit 2.7 (part 1) adds the CSV import
// mapping/parsing/validation pipeline, still pure and DB-free. Unit 2.8 part 1
// adds the hard-filter/ranking matching engine, also pure and DB-free; part 2
// adds `ManualPartDetails` (the manual/custom part payload shape) here, with
// `ComponentAssignment` persistence in lib/db/repositories/
// component-assignment-repository.ts and orchestration in
// lib/application/catalogs/assign-component.ts.

export type {
  ComponentAttributeFieldDefinition,
  ComponentAttributes,
  DataQualityStatus,
  ManualPartDetails,
  PartLifecycleStatus,
} from "./types";
export {
  ComponentAttributeFieldDefinitionSchema,
  ComponentAttributeFieldListSchema,
  ComponentAttributesSchema,
  ManualPartDetailsSchema,
} from "./schemas";

export type {
  CsvSupportedValueKind,
  ImportIdentityTarget,
  ImportMapping,
  ImportMappingField,
  ImportMappingFieldSource,
} from "./import-mapping";
export {
  CSV_SUPPORTED_VALUE_KINDS,
  IMPORT_IDENTITY_TARGETS,
  isCsvSupportedValueKind,
  isImportIdentityTarget,
} from "./import-mapping";
export { ImportMappingSchema } from "./import-mapping-schemas";

export type {
  CsvFieldError,
  CsvImportReport,
  ImportRowResult,
} from "./csv-import";
export { CsvImportError, parseCatalogCsv, parseCsvTable } from "./csv-import";

export type {
  CandidateEvaluation,
  CandidatePart,
  ComparisonOperator,
  CriterionEvaluation,
  CriterionFailureReason,
  MatchCriterion,
  MatchResult,
  RankedCandidate,
  RequiredSpecEntry,
} from "./matching-types";
export { MatchCriterionError } from "./matching-types";
export {
  describeRequiredSpec,
  evaluateCandidate,
  evaluateCandidates,
  evaluateCriterion,
  rankCandidates,
} from "./matching";
