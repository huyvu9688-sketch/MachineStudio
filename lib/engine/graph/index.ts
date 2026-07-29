// Public surface of the parameter graph (Unit 1.8). The application layer builds
// a graph from persisted requirements, values, and confirmed links, then uses
// these deterministic functions to suggest sources, reject cycles, and compute
// stale impact. The compile-time parity guard in ./schemas is not re-exported.

export type {
  ScopeId,
  NodeId,
  LinkId,
  GraphScope,
  GraphNodeKind,
  GraphNode,
  GraphLink,
  ParameterGraph,
  ApprovedParameterMapping,
  LinkIncompatibilityReason,
  LinkCompatibility,
  SuggestionOrigin,
  SourceSuggestion,
  StaleImpact,
} from "./types";
export { asScopeId, asNodeId, asLinkId } from "./types";

export {
  GraphScopeSchema,
  GraphNodeSchema,
  GraphLinkSchema,
  ParameterGraphSchema,
  ApprovedParameterMappingSchema,
  parseParameterGraph,
} from "./schemas";

export { ParameterGraphError, type ParameterGraphErrorCode } from "./errors";

export {
  evaluateLinkCompatibility,
  type CompatibilityOptions,
} from "./compatibility";

export {
  buildParameterGraph,
  wouldCreateCycle,
  downstreamNodeIds,
  computeStaleImpact,
  type IndexedParameterGraph,
} from "./graph";

export { suggestSources, type SuggestOptions } from "./suggest";
