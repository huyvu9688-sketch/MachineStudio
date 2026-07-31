// Public surface of the canonical parameter registry (Unit 1.3). Modules,
// the parameter graph, and requirements reference parameters through this
// barrel. See ./README.md for the parameter proposal checklist.

export type {
  ParameterId,
  ParameterValueType,
  ParameterLifecycle,
  BoundQualifier,
  AggregationQualifier,
  LoadNatureQualifier,
  ParameterQualifiers,
  LoadCaseCategory,
  FrameRequirement,
  ValidRange,
  DefaultPolicy,
  ParameterDefinition,
} from "./types";
export { asParameterId } from "./types";

export type { ParameterSpec } from "./define";
export { defineParameter } from "./define";

export { ParameterDefinitionSchema, parseParameterDefinition } from "./schemas";

export {
  ParameterRegistryError,
  type ParameterRegistryErrorCode,
} from "./errors";

export type { ParameterRegistry } from "./registry";
export { buildParameterRegistry, parameterScope } from "./registry";

export { contentHash, stableStringify } from "./hash";

export {
  PARAMETER_DEFINITIONS,
  PARAMETER_REGISTRY_VERSION,
} from "./definitions";

export {
  PARAMETER_REGISTRY,
  PARAMETER_REGISTRY_HASH,
  PARAMETER_REGISTRY_SUPPORTED_VERSIONS,
  getParameter,
  hasParameter,
  listParameters,
  resolveParameter,
} from "./registered";
