// Public surface of the engineering value package (Unit 1.1). Modules and the
// rest of lib/engine consume values through this barrel. The compile-time
// parity guard in ./schemas is intentionally not re-exported.

export { SERIALIZATION_FORMAT_VERSION } from "./format";
export type { SerializationFormatVersion } from "./format";

export type {
  EngineeringValue,
  EngineeringValueKind,
  Quantity,
  VectorQuantity,
  Curve,
  CurvePoint,
  LoadSpectrum,
  LoadSpectrumBin,
  TableValue,
  TableColumn,
  TableCell,
  EnumValue,
  BooleanValue,
  MaterialReference,
  ComponentReference,
} from "./types";

export {
  QuantitySchema,
  VectorQuantitySchema,
  CurveSchema,
  LoadSpectrumSchema,
  TableValueSchema,
  EnumValueSchema,
  BooleanValueSchema,
  MaterialReferenceSchema,
  ComponentReferenceSchema,
  EngineeringValueSchema,
} from "./schemas";

export {
  parseEngineeringValue,
  safeParseEngineeringValue,
  serializeEngineeringValue,
  deserializeEngineeringValue,
} from "./serialization";

export {
  isEngineeringValue,
  isQuantity,
  isVectorQuantity,
  isCurve,
  isLoadSpectrum,
  isTableValue,
  isEnumValue,
  isBooleanValue,
  isMaterialReference,
  isComponentReference,
} from "./guards";

export {
  engineeringValuesEqual,
  engineeringValuesClose,
} from "./equality";
export type { ToleranceOptions } from "./equality";
