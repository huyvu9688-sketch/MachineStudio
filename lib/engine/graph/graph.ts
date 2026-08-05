// Parameter graph construction and traversal (Unit 1.8). `buildParameterGraph`
// validates a graph's shape and referential integrity and indexes it into a
// feed graph; the traversal functions then answer the graph's structural
// questions deterministically, independent of the database and UI:
//
//   wouldCreateCycle       — would confirming a link close a dependency cycle?
//   downstreamNodeIds      — which nodes depend (transitively) on a change?
//   computeStaleImpact     — which module runs therefore become stale?
//
// The *feed graph* has an edge `from → to` meaning "from feeds to" (to depends
// on from). Its edges are (a) every confirmed link (source → target) and
// (b) every module instance's internal dependency (each input feeds each
// output). Feedback loops are handled inside a module or workflow solver, never
// as graph cycles (context/architecture.md "Link Behavior").

import { ParameterGraphError, type ParameterGraphErrorCode } from "./errors";
import { ParameterGraphSchema } from "./schemas";
import type {
  GraphNode,
  GraphScope,
  NodeId,
  ParameterGraph,
  StaleImpact,
} from "./types";

/** A validated, indexed parameter graph ready for traversal. */
export interface IndexedParameterGraph {
  readonly graph: ParameterGraph;
  readonly nodeById: ReadonlyMap<string, GraphNode>;
  readonly scopeById: ReadonlyMap<string, GraphScope>;
  /** Feed adjacency: node ID → the IDs of the nodes it feeds. */
  readonly feedAdjacency: ReadonlyMap<string, ReadonlySet<string>>;
}

function fail(
  code: ParameterGraphErrorCode,
  message: string,
  subjectId?: string,
): never {
  throw new ParameterGraphError(code, message, subjectId);
}

/** Rejects a scope hierarchy that references an unknown parent or forms a cycle. */
function validateScopeHierarchy(
  scopes: readonly GraphScope[],
  scopeById: ReadonlyMap<string, GraphScope>,
): void {
  for (const scope of scopes) {
    const seen = new Set<string>([scope.id]);
    let current = scope.parentId;
    while (current !== undefined) {
      if (!scopeById.has(current)) {
        fail(
          "unknown_scope_parent",
          `Scope "${scope.id}" has unknown parent "${current}".`,
          scope.id,
        );
      }
      if (seen.has(current)) {
        fail("scope_cycle", `Scope hierarchy cycle at "${current}".`, current);
      }
      seen.add(current);
      current = scopeById.get(current)?.parentId;
    }
  }
}

/**
 * Validates a parameter graph and indexes it into a feed graph.
 *
 * @throws {@link ParameterGraphError} on the first integrity violation.
 */
export function buildParameterGraph(
  graph: ParameterGraph,
): IndexedParameterGraph {
  const parsed = ParameterGraphSchema.safeParse(graph);
  if (!parsed.success) {
    fail("invalid_shape", `Malformed parameter graph: ${parsed.error.message}`);
  }
  const value: ParameterGraph = parsed.data;

  const scopeById = new Map<string, GraphScope>();
  for (const scope of value.scopes) {
    if (scopeById.has(scope.id)) {
      fail("duplicate_id", `Duplicate scope ID "${scope.id}".`, scope.id);
    }
    scopeById.set(scope.id, scope);
  }
  validateScopeHierarchy(value.scopes, scopeById);

  const nodeById = new Map<string, GraphNode>();
  for (const node of value.nodes) {
    if (nodeById.has(node.id)) {
      fail("duplicate_id", `Duplicate node ID "${node.id}".`, node.id);
    }
    if (!scopeById.has(node.scopeId)) {
      fail(
        "unknown_scope",
        `Node "${node.id}" references unknown scope "${node.scopeId}".`,
        node.id,
      );
    }
    if (
      (node.kind === "module_input" || node.kind === "module_output") &&
      node.moduleInstanceId === undefined
    ) {
      fail(
        "missing_module_instance",
        `Module port node "${node.id}" has no owning module instance.`,
        node.id,
      );
    }
    nodeById.set(node.id, node);
  }

  const linkIds = new Set<string>();
  const feed = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string): void => {
    let set = feed.get(from);
    if (set === undefined) {
      set = new Set<string>();
      feed.set(from, set);
    }
    set.add(to);
  };

  for (const link of value.links) {
    if (linkIds.has(link.id)) {
      fail("duplicate_id", `Duplicate link ID "${link.id}".`, link.id);
    }
    linkIds.add(link.id);
    const source = nodeById.get(link.sourceNodeId);
    const target = nodeById.get(link.targetNodeId);
    if (source === undefined) {
      fail(
        "unknown_node",
        `Link "${link.id}" references unknown source "${link.sourceNodeId}".`,
        link.id,
      );
    }
    if (target === undefined) {
      fail(
        "unknown_node",
        `Link "${link.id}" references unknown target "${link.targetNodeId}".`,
        link.id,
      );
    }
    if (target.kind !== "module_input") {
      fail(
        "invalid_link_target",
        `Link "${link.id}" target "${target.id}" is a ${target.kind}, not a module input.`,
        link.id,
      );
    }
    if (source.kind === "module_input") {
      fail(
        "invalid_link_source",
        `Link "${link.id}" source "${source.id}" is a module input and cannot provide a value.`,
        link.id,
      );
    }
    addEdge(source.id, target.id);
  }

  // Module-internal dependency edges: each input feeds each output of the module.
  const moduleInputs = new Map<string, string[]>();
  const moduleOutputs = new Map<string, string[]>();
  for (const node of value.nodes) {
    if (node.moduleInstanceId === undefined) continue;
    const bucket =
      node.kind === "module_input"
        ? moduleInputs
        : node.kind === "module_output"
          ? moduleOutputs
          : undefined;
    if (bucket === undefined) continue;
    const list = bucket.get(node.moduleInstanceId) ?? [];
    list.push(node.id);
    bucket.set(node.moduleInstanceId, list);
  }
  for (const [moduleInstanceId, inputs] of moduleInputs) {
    for (const outputId of moduleOutputs.get(moduleInstanceId) ?? []) {
      for (const inputId of inputs) addEdge(inputId, outputId);
    }
  }

  return { graph: value, nodeById, scopeById, feedAdjacency: feed };
}

/** True when `to` is reachable from `from` following feed edges. */
function canReach(
  feedAdjacency: ReadonlyMap<string, ReadonlySet<string>>,
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const visited = new Set<string>([from]);
  const queue: string[] = [from];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of feedAdjacency.get(current) ?? []) {
      if (next === to) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/**
 * Whether confirming a link from `sourceNodeId` to `targetNodeId` would close a
 * dependency cycle. It would iff the target already feeds the source (directly
 * or transitively) — adding source → target then completes the loop
 * (invariant "Acyclic graph"). Unknown node IDs never form a cycle.
 */
export function wouldCreateCycle(
  indexed: IndexedParameterGraph,
  sourceNodeId: NodeId,
  targetNodeId: NodeId,
): boolean {
  if (sourceNodeId === targetNodeId) return true;
  return canReach(indexed.feedAdjacency, targetNodeId, sourceNodeId);
}

/**
 * The IDs of every node whose value transitively depends on any of `changedNodeIds`
 * (i.e. is reachable following feed edges), excluding the changed nodes
 * themselves. Deterministic breadth-first order.
 */
export function downstreamNodeIds(
  indexed: IndexedParameterGraph,
  changedNodeIds: Iterable<NodeId>,
): NodeId[] {
  const seeds = new Set<string>();
  for (const id of changedNodeIds) seeds.add(id);

  const result: string[] = [];
  const inResult = new Set<string>();
  const queue: string[] = [...seeds];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of indexed.feedAdjacency.get(current) ?? []) {
      if (seeds.has(next) || inResult.has(next)) continue;
      inResult.add(next);
      result.push(next);
      queue.push(next);
    }
  }
  return result as NodeId[];
}

/**
 * The stale impact of changing `changedNodeIds`: the downstream nodes and the
 * distinct module instances (calculation runs) they belong to, which the
 * application layer marks stale in one transaction (invariant "Transactional
 * stale propagation").
 */
export function computeStaleImpact(
  indexed: IndexedParameterGraph,
  changedNodeIds: Iterable<NodeId>,
): StaleImpact {
  const downstream = downstreamNodeIds(indexed, changedNodeIds);
  const moduleInstanceIds: string[] = [];
  const seen = new Set<string>();
  for (const id of downstream) {
    const node = indexed.nodeById.get(id);
    if (
      node?.moduleInstanceId !== undefined &&
      !seen.has(node.moduleInstanceId)
    ) {
      seen.add(node.moduleInstanceId);
      moduleInstanceIds.push(node.moduleInstanceId);
    }
  }
  return {
    downstreamNodeIds: downstream,
    staleModuleInstanceIds: moduleInstanceIds,
  };
}
