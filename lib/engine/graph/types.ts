// Parameter graph contracts (Unit 1.8). The parameter graph connects the value
// sources in a machine (requirements, assembly parameters, workflow-provided
// values, and module output ports) to the value sinks (module input ports)
// through explicitly confirmed links. This module owns the *contracts*; the
// deterministic algorithms live in ./compatibility (link safety), ./suggest
// (nearest-scope suggestions), and ./graph (cycle detection, downstream
// resolution, stale impact). It is independent of the database and UI
// (context/architecture.md "Parameter Graph"; context/implementation-map.md
// Unit 1.8 exit criterion).
//
// Semantic identity of a node comes from its canonical parameter (Unit 1.3):
// value family, dimension, qualifier axes, and coordinate frame. Two nodes are
// only link-compatible when they speak the same parameter (or an explicitly
// approved mapping) and agree on every populated semantic axis and the load
// case. Unit compatibility alone is never sufficient (invariant "Semantic link
// safety").

import type { ParameterId, LoadCaseCategory } from "../parameters";

/** A scope identifier: a machine, assembly, or workflow container. */
export type ScopeId = string & { readonly __brand: "ScopeId" };
/** A parameter-graph node identifier. */
export type NodeId = string & { readonly __brand: "NodeId" };
/** A confirmed-link identifier. */
export type LinkId = string & { readonly __brand: "LinkId" };

/** Casts a raw string to a {@link ScopeId}. Identity at runtime. */
export function asScopeId(id: string): ScopeId {
  return id as ScopeId;
}
/** Casts a raw string to a {@link NodeId}. Identity at runtime. */
export function asNodeId(id: string): NodeId {
  return id as NodeId;
}
/** Casts a raw string to a {@link LinkId}. Identity at runtime. */
export function asLinkId(id: string): LinkId {
  return id as LinkId;
}

/**
 * A scope in the machine hierarchy: the machine root, an assembly, or a
 * sub-assembly. Nearest-scope suggestion walks `parentId` from a sink toward the
 * root. The machine root has no `parentId`.
 */
export interface GraphScope {
  readonly id: ScopeId;
  /** Parent scope; absent for the machine root. */
  readonly parentId?: ScopeId;
}

/**
 * The role a node plays in the machine graph. Every kind provides a value
 * (a *source*) except `module_input`, which consumes one (a *sink*). Only a
 * `module_input` may be the target of a confirmed link.
 */
export type GraphNodeKind =
  | "machine_requirement"
  | "assembly_parameter"
  | "workflow_parameter"
  | "module_output"
  | "module_input";

/**
 * A node in the parameter graph: a value-bearing port bound to a canonical
 * parameter, living in a scope. Module ports additionally carry the owning
 * module instance so intra-module dependencies (inputs feed outputs) and stale
 * propagation can be computed.
 */
export interface GraphNode {
  readonly id: NodeId;
  readonly kind: GraphNodeKind;
  /** Canonical parameter this node speaks. */
  readonly parameterId: ParameterId;
  /** Scope this node lives in. */
  readonly scopeId: ScopeId;
  /** Load case this node pertains to, when load-case specific. */
  readonly loadCase?: LoadCaseCategory;
  /** Owning module instance; required for `module_input`/`module_output`. */
  readonly moduleInstanceId?: string;
}

/**
 * A confirmed parameter link: a value flows from `sourceNodeId` (a provider) to
 * `targetNodeId` (a `module_input`). Links are never created silently; this
 * record represents one the user has confirmed (invariant "No silent binding").
 */
export interface GraphLink {
  readonly id: LinkId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
}

/** The persisted/serializable parameter graph for one machine configuration. */
export interface ParameterGraph {
  readonly scopes: readonly GraphScope[];
  readonly nodes: readonly GraphNode[];
  readonly links: readonly GraphLink[];
}

/**
 * An explicitly approved mapping between two *different* canonical parameters,
 * permitting a link that is not a plain parameter-identity match. The mapping
 * authorizes the identity criterion only; the graph still verifies value family,
 * dimension, qualifiers, and frame are compatible (context/architecture.md
 * "Link Compatibility": "Parameter identity or an explicit approved mapping").
 */
export interface ApprovedParameterMapping {
  /** Source (provider) parameter. */
  readonly from: ParameterId;
  /** Target (sink) parameter. */
  readonly to: ParameterId;
  /** Optional human note on why the mapping is approved. */
  readonly note?: string;
}

/**
 * Why a candidate link is rejected. A compatible link has an empty reason list.
 * Reasons are ordered from structural (direction, identity) to semantic
 * (dimension, qualifiers, load case).
 */
export type LinkIncompatibilityReason =
  /** Source is a sink, or target is not a consumable `module_input`. */
  | "direction"
  /** Different parameters with no approved mapping. */
  | "parameter_identity"
  /** Incompatible engineering value family. */
  | "value_type"
  /** Incompatible physical dimension. */
  | "dimension"
  /** Enum parameters with different enumerations. */
  | "enum_type"
  /** Incompatible required/allowable bound. */
  | "bound"
  /** Incompatible peak/rms/nominal/mean aggregation. */
  | "aggregation"
  /** Incompatible static/dynamic load nature. */
  | "load_nature"
  /** Incompatible coordinate frame / direction. */
  | "frame"
  /** The two nodes pertain to different load cases. */
  | "load_case";

/** The result of evaluating whether a source may link to a sink. */
export interface LinkCompatibility {
  readonly compatible: boolean;
  /** Empty when compatible; otherwise the violated criteria. */
  readonly reasons: readonly LinkIncompatibilityReason[];
  /** True when the link relies on an approved cross-parameter mapping. */
  readonly mapped: boolean;
}

/** Where a suggested source sits relative to the requesting sink. */
export type SuggestionOrigin = "scope" | "cross_assembly";

/** A suggested source for a sink, ranked by scope proximity. */
export interface SourceSuggestion {
  readonly sourceNodeId: NodeId;
  /**
   * Scope hops from the sink's scope to the source's scope: `0` for the same
   * scope, `n` for the n-th ancestor. Cross-assembly sources use a distance
   * beyond every ancestor so they always rank last.
   */
  readonly scopeDistance: number;
  readonly origin: SuggestionOrigin;
  /** True when the suggestion relies on an approved cross-parameter mapping. */
  readonly viaMapping: boolean;
}

/**
 * The downstream impact of changing one or more nodes: every node whose value
 * transitively depends on a changed node, and the module instances whose
 * calculation runs therefore become stale (context/architecture.md invariant
 * "Transactional stale propagation" — the graph computes the impact; the
 * application layer applies it in one transaction).
 */
export interface StaleImpact {
  readonly downstreamNodeIds: readonly NodeId[];
  readonly staleModuleInstanceIds: readonly string[];
}
