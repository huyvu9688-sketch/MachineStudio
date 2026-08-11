// The `loadAssemblyReportView` use case (Unit 5.2: "Module and assembly
// report renderer"). Rolls up one assembly's own printable report — every
// module instance directly in it plus every nested child assembly,
// recursively — by composing `loadModuleReportView` per module instance
// rather than duplicating its resolution logic. Mirrors `loadBomView`'s own
// tree-walk shape (lib/application/reports/load-bom-view.ts) one level
// narrower: a BOM view starts from the whole configuration, this starts from
// one named assembly.
//
// `buildAssemblyReportNode` is also exported for `loadMachineReportView`
// (Unit 5.3) to call once per root assembly — the whole-machine package
// needs every root's own tree, not one named assembly's, but it is the
// exact same per-node operation, so it is shared rather than duplicated.

import "server-only";
import {
  loadAssemblyForOwner,
  loadConfigurationTree,
  type AssemblyId,
  type AssemblyNode,
  type UserId,
} from "@/lib/db";
import { loadModuleReportView, type ModuleReportView } from "./load-module-report-view";

/** One assembly's own module reports, nested under its children exactly like `AssemblyNode`. */
export interface AssemblyReportNode {
  readonly assemblyId: string;
  readonly assemblyName: string;
  readonly modules: readonly ModuleReportView[];
  readonly children: readonly AssemblyReportNode[];
}

/** What the printable assembly report renderer needs for one assembly and its descendants. */
export interface AssemblyReportView {
  readonly configurationId: string;
  readonly configurationName: string;
  readonly root: AssemblyReportNode;
}

export async function buildAssemblyReportNode(
  node: AssemblyNode,
  ownerId: UserId,
): Promise<AssemblyReportNode> {
  const modules: ModuleReportView[] = [];
  for (const moduleInstance of node.moduleInstances) {
    const view = await loadModuleReportView(moduleInstance.id, ownerId);
    // `loadModuleReportView` only returns `null` for an unowned/unregistered
    // module instance — neither can happen here, since `node` itself was
    // already loaded scoped to the same `ownerId` and every registered
    // instance names a package present at write time. Skipped rather than
    // thrown so one stale/unregistered package cannot fail the whole report.
    if (view !== null) {
      modules.push(view);
    }
  }

  const children: AssemblyReportNode[] = [];
  for (const child of node.children) {
    children.push(await buildAssemblyReportNode(child, ownerId));
  }

  return {
    assemblyId: node.id,
    assemblyName: node.name,
    modules,
    children,
  };
}

/** Depth-first search for `assemblyId` within a configuration's loaded assembly forest. */
function findAssemblyNode(
  nodes: readonly AssemblyNode[],
  assemblyId: string,
): AssemblyNode | null {
  for (const node of nodes) {
    if (node.id === assemblyId) {
      return node;
    }
    const found = findAssemblyNode(node.children, assemblyId);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

/**
 * Loads the printable assembly report read model for `assemblyId` and its
 * descendants, scoped to `ownerId`. Returns `null` when the assembly does
 * not exist or is not owned by `ownerId` — the same "nothing real to
 * render" outcome `loadBomView` returns for an unknown/foreign
 * configuration.
 */
export async function loadAssemblyReportView(
  assemblyId: AssemblyId,
  ownerId: UserId,
): Promise<AssemblyReportView | null> {
  const assembly = await loadAssemblyForOwner(assemblyId, ownerId);
  if (assembly === null) {
    return null;
  }

  const tree = await loadConfigurationTree(assembly.configurationId, ownerId);
  if (tree === null) {
    // Ownership already passed above; this would only happen on a race with
    // a concurrent delete between the two loads.
    return null;
  }

  const node = findAssemblyNode(tree.assemblies, assemblyId);
  if (node === null) {
    return null;
  }

  const root = await buildAssemblyReportNode(node, ownerId);
  return {
    configurationId: tree.id,
    configurationName: tree.name,
    root,
  };
}
