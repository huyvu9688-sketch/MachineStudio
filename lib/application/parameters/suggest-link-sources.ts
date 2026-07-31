// Link-suggestion read model (Unit 3.4, `implementation-map.md`: "Suggestion
// banner", "Origin and scope display", "Parameter semantic details"). Builds
// the same nearest-scope-first candidate list `lib/engine/graph`'s
// `suggestSources` (Unit 1.8) computes, then describes each candidate with
// what a human needs to decide (ui-context.md "Link Suggestions": "Never
// display only a value. Always show parameter meaning, origin, assembly
// scope, and load case").
//
// `suggestSources` only knows node IDs; it has no database access and no
// notion of assembly names or module labels. This module is the missing
// bridge: it reconstructs a real, per-assembly-scoped `IndexedParameterGraph`
// for a whole configuration (unlike `lib/db`'s `loadConfigurationGraph`,
// which — correctly, for its own callers — collapses every node into one
// synthetic scope because cycle rejection and stale-impact traversal do not
// care about scope proximity; only suggestion ranking does), plus the side
// tables (assembly names, module labels, current provider values) needed to
// describe a candidate in human terms.
//
// Confirming a suggestion is NOT this module's job — it is unchanged
// `confirmParameterLink` (Unit 2.5), which is the sole authority for link
// safety (context/architecture.md "Semantic link safety"). A suggestion here
// is a proposal only; nothing here writes.

import "server-only";
import {
  asLinkId,
  asParameterId,
  asScopeId,
  buildParameterGraph,
  getParameter,
  suggestSources,
  type EngineeringValue,
  type GraphLink,
  type GraphNode,
  type GraphNodeKind,
  type GraphScope,
  type IndexedParameterGraph,
  type LoadCaseCategory,
  type NodeId,
  type ParameterGraph,
  type ScopeId,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  listCurrentParameterValuesForConfiguration,
  listParameterLinksForConfiguration,
  loadConfigurationTree,
  parameterGraphNodeId,
  type AssemblyNode,
  type GraphNodeDescriptor,
  type MachineConfigurationId,
  type UserId,
} from "@/lib/db";

/** A suggested source's kind — never `module_input`; a sink cannot provide a value. */
export type LinkSuggestionSourceKind = Exclude<GraphNodeKind, "module_input">;

/** One suggested source for a module input port, fully described for the UI. */
export interface LinkSuggestionSourceView {
  readonly sourceKind: LinkSuggestionSourceKind;
  readonly sourceModuleInstanceId: string | null;
  readonly sourceAssemblyId: string | null;
  readonly sourceParameterId: string;
  readonly sourceLoadCase: LoadCaseCategory | null;
  /** The parameter's registered display name; falls back to its ID when unregistered. */
  readonly parameterLabel: string;
  /** "Machine" for the configuration root, or the owning assembly's name. */
  readonly scopeLabel: string;
  /** The owning module instance's label, set only when `sourceKind === "module_output"`. */
  readonly moduleLabel: string | null;
  readonly origin: "scope" | "cross_assembly";
  /**
   * The source's current authored value. `null` for a `module_output` source
   * (its value comes from that module's calculation run, not visible without
   * loading a run snapshot — the same "value comes from that module's
   * calculation run" posture the linked-field notice in `module-input-
   * workspace.tsx` already uses) or a provider that has no authored value yet.
   */
  readonly value: EngineeringValue | null;
}

/** At most this many ranked suggestions are described per field (nearest-scope-first order is preserved). */
export const MAX_LINK_SUGGESTIONS_PER_FIELD = 5;

/** A configuration's suggestion-ready graph, plus the side tables needed to describe a candidate. */
export interface ConfigurationSuggestionIndex {
  readonly indexed: IndexedParameterGraph;
  readonly rootScopeId: ScopeId;
  readonly scopeLabelByScopeId: ReadonlyMap<string, string>;
  readonly moduleLabelByInstanceId: ReadonlyMap<string, string>;
  readonly valueByNodeId: ReadonlyMap<NodeId, EngineeringValue>;
}

function flattenAssemblies(nodes: readonly AssemblyNode[]): AssemblyNode[] {
  const out: AssemblyNode[] = [];
  const walk = (list: readonly AssemblyNode[]): void => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** Builds a `GraphNode` for `descriptor`, scoped to `scopeId` (unlike `lib/db`'s single-scope reconstruction). */
function graphNodeAt(descriptor: GraphNodeDescriptor, scopeId: string): GraphNode {
  return {
    id: parameterGraphNodeId(descriptor),
    kind: descriptor.kind,
    parameterId: asParameterId(descriptor.parameterId),
    scopeId: asScopeId(scopeId),
    ...(descriptor.loadCase !== null ? { loadCase: descriptor.loadCase } : {}),
    ...(descriptor.moduleInstanceId !== null
      ? { moduleInstanceId: descriptor.moduleInstanceId }
      : {}),
  };
}

/**
 * Reconstructs the full, per-assembly-scoped candidate graph for a
 * configuration: every module instance's declared ports (so intra-module
 * feed edges and cross-module cycle rejection both still work), every
 * provider's current authored value, and every confirmed link. Returns
 * `null` when the configuration is not owned by `ownerId`.
 *
 * A module instance whose package cannot be resolved contributes no port
 * nodes here (mirrors `lib/application/parameters/stale-propagation.ts`'s
 * `moduleInstancePortDescriptors`: degraded but safe, not a thrown error) —
 * except when one of its ports is already a confirmed link endpoint, in
 * which case the endpoint is still added defensively so the graph stays
 * internally consistent (`buildParameterGraph` would otherwise reject the
 * link as referencing an unknown node).
 */
export async function buildConfigurationSuggestionIndex(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
): Promise<ConfigurationSuggestionIndex | null> {
  const tree = await loadConfigurationTree(configurationId, ownerId);
  if (tree === null) return null;

  const assemblies = flattenAssemblies(tree.assemblies);
  const moduleInstances = assemblies.flatMap((a) => a.moduleInstances);

  const rootScopeId = asScopeId(configurationId);
  const scopes: GraphScope[] = [
    { id: rootScopeId },
    ...assemblies.map(
      (a): GraphScope => ({
        id: asScopeId(a.id),
        parentId: asScopeId(a.parentId ?? configurationId),
      }),
    ),
  ];

  const scopeLabelByScopeId = new Map<string, string>([[configurationId, "Machine"]]);
  for (const a of assemblies) scopeLabelByScopeId.set(a.id, a.name);

  const moduleLabelByInstanceId = new Map(moduleInstances.map((mi) => [mi.id as string, mi.label]));
  const moduleAssemblyById = new Map(
    moduleInstances.map((mi) => [mi.id as string, mi.assemblyId as string]),
  );

  const nodes = new Map<string, GraphNode>();
  const addNode = (descriptor: GraphNodeDescriptor, scopeId: string): GraphNode => {
    const node = graphNodeAt(descriptor, scopeId);
    nodes.set(node.id, node);
    return node;
  };

  for (const mi of moduleInstances) {
    const pkg = getModulePackage(mi.modulePackageId, mi.moduleVersion);
    if (pkg === undefined) continue;
    for (const port of pkg.ports.inputs) {
      addNode(
        {
          kind: "module_input",
          moduleInstanceId: mi.id,
          assemblyId: null,
          parameterId: port.parameterId,
          loadCase: port.loadCase ?? null,
        },
        mi.assemblyId,
      );
    }
    for (const port of pkg.ports.outputs) {
      addNode(
        {
          kind: "module_output",
          moduleInstanceId: mi.id,
          assemblyId: null,
          parameterId: port.parameterId,
          loadCase: port.loadCase ?? null,
        },
        mi.assemblyId,
      );
    }
  }

  const valueByNodeId = new Map<NodeId, EngineeringValue>();
  const currentValues = await listCurrentParameterValuesForConfiguration(configurationId, ownerId);
  for (const row of currentValues) {
    // A module_input value is an authored sink value (a manual/workflow input),
    // never a provider — it must never appear as a suggestible source.
    if (row.nodeKind === "module_input") continue;
    const descriptor: GraphNodeDescriptor = {
      kind: row.nodeKind,
      moduleInstanceId: null,
      assemblyId: row.assemblyId,
      parameterId: row.parameterId,
      loadCase: row.loadCase,
    };
    const node = addNode(descriptor, row.assemblyId ?? configurationId);
    valueByNodeId.set(node.id, row.value);
  }

  const linkRows = await listParameterLinksForConfiguration(configurationId, ownerId);
  const links: GraphLink[] = linkRows.map((link) => {
    const targetDescriptor: GraphNodeDescriptor = {
      kind: "module_input",
      moduleInstanceId: link.targetModuleInstanceId,
      assemblyId: null,
      parameterId: link.targetParameterId,
      loadCase: link.targetLoadCase,
    };
    const sourceDescriptor: GraphNodeDescriptor = {
      kind: link.sourceKind,
      moduleInstanceId: link.sourceModuleInstanceId,
      assemblyId: link.sourceAssemblyId,
      parameterId: link.sourceParameterId,
      loadCase: link.sourceLoadCase,
    };
    const targetScope = moduleAssemblyById.get(link.targetModuleInstanceId) ?? configurationId;
    const sourceScope =
      link.sourceModuleInstanceId !== null
        ? moduleAssemblyById.get(link.sourceModuleInstanceId) ?? configurationId
        : link.sourceAssemblyId ?? configurationId;
    const targetNode = addNode(targetDescriptor, targetScope);
    const sourceNode = addNode(sourceDescriptor, sourceScope);
    return { id: asLinkId(link.id), sourceNodeId: sourceNode.id, targetNodeId: targetNode.id };
  });

  const graph: ParameterGraph = { scopes, nodes: [...nodes.values()], links };
  const indexed = buildParameterGraph(graph);

  return { indexed, rootScopeId, scopeLabelByScopeId, moduleLabelByInstanceId, valueByNodeId };
}

/**
 * Ranks and describes the link suggestions for `sinkNodeId` (a `module_input`
 * node already present in `index`), nearest scope first, capped at
 * {@link MAX_LINK_SUGGESTIONS_PER_FIELD}. Returns `[]` when the sink is
 * unknown or has no compatible, visible source — an empty suggestion list,
 * not an error (most fields will have none).
 */
export function describeLinkSuggestions(
  index: ConfigurationSuggestionIndex,
  sinkNodeId: NodeId,
): LinkSuggestionSourceView[] {
  const suggestions = suggestSources(index.indexed, sinkNodeId);
  return suggestions.slice(0, MAX_LINK_SUGGESTIONS_PER_FIELD).map((suggestion) => {
    const node = index.indexed.nodeById.get(suggestion.sourceNodeId);
    if (node === undefined) {
      // suggestSources only ever returns node IDs it read out of the same
      // `index.indexed`, so this would be an invariant violation, not a
      // reachable user-facing state.
      throw new Error(`Suggested source node "${suggestion.sourceNodeId}" is missing from the index.`);
    }
    const definition = getParameter(node.parameterId);
    const isModuleOutput = node.kind === "module_output";
    return {
      sourceKind: node.kind as LinkSuggestionSourceKind,
      sourceModuleInstanceId: node.moduleInstanceId ?? null,
      sourceAssemblyId: isModuleOutput || node.scopeId === index.rootScopeId ? null : node.scopeId,
      sourceParameterId: node.parameterId,
      sourceLoadCase: node.loadCase ?? null,
      parameterLabel: definition?.displayName ?? node.parameterId,
      scopeLabel: index.scopeLabelByScopeId.get(node.scopeId) ?? node.scopeId,
      moduleLabel:
        isModuleOutput && node.moduleInstanceId !== undefined
          ? index.moduleLabelByInstanceId.get(node.moduleInstanceId) ?? null
          : null,
      origin: suggestion.origin,
      value: isModuleOutput ? null : index.valueByNodeId.get(node.id) ?? null,
    };
  });
}
