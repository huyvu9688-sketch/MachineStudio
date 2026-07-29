// Nearest-scope source suggestion (Unit 1.8). For a sink (a module input),
// enumerates the compatible, visible sources and ranks them by scope proximity:
// the sink's own scope first, then each ancestor scope up to the machine root
// (where requirements live), then explicitly exposed cross-assembly sources
// (context/architecture.md "Link Behavior"). Suggestions are proposals only —
// the user confirms every link (invariant "No silent binding").
//
// A source is skipped when it is incompatible (see ./compatibility) or when
// confirming the link would close a dependency cycle (see ./graph). Ordering is
// deterministic: (scope before cross-assembly, then scope distance, then node
// ID), independent of node insertion order.

import type { ParameterRegistry } from "../parameters";
import type { CompatibilityOptions } from "./compatibility";
import { evaluateLinkCompatibility } from "./compatibility";
import type { IndexedParameterGraph } from "./graph";
import { wouldCreateCycle } from "./graph";
import type {
  ApprovedParameterMapping,
  GraphNode,
  NodeId,
  SourceSuggestion,
} from "./types";

/** Options for {@link suggestSources}. */
export interface SuggestOptions extends CompatibilityOptions {
  readonly registry?: ParameterRegistry;
  readonly mappings?: readonly ApprovedParameterMapping[];
  /**
   * Source node IDs from other assemblies that are explicitly exposed to this
   * sink. Such a source is visible even though its scope is not an ancestor of
   * the sink's scope; it always ranks after every in-scope/ancestor source.
   */
  readonly crossAssemblySourceIds?: readonly NodeId[];
}

/**
 * Scope hops from `fromScopeId` up to `ancestorScopeId`: `0` when equal, `n`
 * when the ancestor is the n-th parent, or `undefined` when it is not an
 * ancestor. Assumes an acyclic hierarchy (enforced by `buildParameterGraph`).
 */
function scopeDistance(
  indexed: IndexedParameterGraph,
  fromScopeId: string,
  ancestorScopeId: string,
): number | undefined {
  let current: string | undefined = fromScopeId;
  let distance = 0;
  while (current !== undefined) {
    if (current === ancestorScopeId) return distance;
    current = indexed.scopeById.get(current)?.parentId;
    distance += 1;
  }
  return undefined;
}

/**
 * Ranks the compatible, visible sources for `sinkNodeId`, nearest scope first.
 * Returns an empty list when the node is unknown or is not a `module_input`.
 */
export function suggestSources(
  indexed: IndexedParameterGraph,
  sinkNodeId: NodeId,
  options: SuggestOptions = {},
): SourceSuggestion[] {
  const sink = indexed.nodeById.get(sinkNodeId);
  if (sink === undefined || sink.kind !== "module_input") return [];

  const crossAssembly = new Set<string>(options.crossAssemblySourceIds ?? []);
  const compatibilityOptions: CompatibilityOptions = {
    ...(options.registry !== undefined && { registry: options.registry }),
    ...(options.mappings !== undefined && { mappings: options.mappings }),
  };

  const suggestions: SourceSuggestion[] = [];
  for (const source of indexed.nodeById.values() as IterableIterator<GraphNode>) {
    if (source.id === sink.id || source.kind === "module_input") continue;

    const distance = scopeDistance(indexed, sink.scopeId, source.scopeId);
    const crossExposed = crossAssembly.has(source.id);
    if (distance === undefined && !crossExposed) continue; // not visible

    const compatibility = evaluateLinkCompatibility(source, sink, compatibilityOptions);
    if (!compatibility.compatible) continue;
    if (wouldCreateCycle(indexed, source.id, sink.id)) continue;

    const origin = distance !== undefined ? "scope" : "cross_assembly";
    suggestions.push({
      sourceNodeId: source.id,
      scopeDistance: distance ?? indexed.scopeById.size,
      origin,
      viaMapping: compatibility.mapped,
    });
  }

  suggestions.sort((a, b) => {
    const originRank = Number(a.origin === "cross_assembly") - Number(b.origin === "cross_assembly");
    if (originRank !== 0) return originRank;
    if (a.scopeDistance !== b.scopeDistance) return a.scopeDistance - b.scopeDistance;
    return a.sourceNodeId < b.sourceNodeId ? -1 : a.sourceNodeId > b.sourceNodeId ? 1 : 0;
  });

  return suggestions;
}
