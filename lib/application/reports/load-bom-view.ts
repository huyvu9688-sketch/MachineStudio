// The `loadBomView` use case (Unit 5.1: "BOM model and generator"). Generates
// a configuration's multi-level Bill of Materials *live*, from data that is
// already fully persisted — `ComponentAssignment` (quantity, part identity,
// target, justifying calculation run) plus the assembly tree it targets —
// rather than from a separately stored `BomItem` table. There is no such
// table (ADR-0008, "BOM is a generated view, not a stored `BomItem` table"):
// a BOM line is always exactly as current as the assignment it is generated
// from, with nothing to keep in sync.
//
// Mirrors `loadComponentAssignmentView`'s own `describePart`/
// `describeAssignment` part-resolution logic (lib/application/catalogs/) —
// same manufacturer-name memoization, same "a dangling part revision
// degrades to a plain description rather than failing the whole view"
// treatment — duplicated rather than imported, since that file's helpers are
// private and code-standards.md prefers explicit duplication over a
// premature shared abstraction for two call sites this different (one
// module instance's assignments vs. a whole configuration's, grouped into a
// tree).

import "server-only";
import {
  loadCalculationRun,
  loadConfigurationTree,
  loadManufacturer,
  loadManufacturerPartRevision,
  listComponentAssignmentsForConfiguration,
  type AssemblyNode,
  type ComponentAssignmentRecord,
  type MachineConfigurationId,
  type UserId,
} from "@/lib/db";

/** One flattened BOM line, resolved from a `ComponentAssignment`. */
export interface BomItem {
  readonly id: string;
  readonly targetKind: "module_instance" | "assembly";
  /** The module instance's own label — `null` for an assembly-targeted item. */
  readonly targetLabel: string | null;
  readonly partSource: "catalog" | "manual";
  readonly description: string;
  readonly manufacturerName: string | null;
  readonly partNumber: string | null;
  /** Catalog edition/date identity — `null` for a manual part. */
  readonly sourceRevision: string | null;
  /** Manual/custom part notes — `null` for a catalog part. */
  readonly notes: string | null;
  readonly quantity: number;
  readonly stale: boolean;
  readonly staleReason: string | null;
  /** The justifying calculation run, when this is a calculated component. */
  readonly calculationRunId: string | null;
  readonly calculationRunCreatedAt: Date | null;
}

/** One assembly's own BOM lines, nested under its children the same way `AssemblyNode` is. */
export interface BomNode {
  readonly assemblyId: string;
  readonly assemblyName: string;
  readonly items: readonly BomItem[];
  readonly children: readonly BomNode[];
}

/** A configuration's full multi-level BOM. */
export interface BomView {
  readonly configurationId: string;
  readonly configurationName: string;
  /**
   * Items assigned at the machine/configuration root — a `ComponentAssignment`
   * with `targetKind: "assembly"` and no `assemblyId`
   * (`prisma/schema.prisma`'s own documented "machine/configuration root"
   * case).
   */
  readonly machineLevelItems: readonly BomItem[];
  readonly assemblies: readonly BomNode[];
  readonly totalLineCount: number;
  readonly staleLineCount: number;
}

/** Resolves one `ComponentAssignmentRecord` into a `BomItem`, given already-indexed lookups. */
async function describeBomItem(
  assignment: ComponentAssignmentRecord,
  ownerId: UserId,
  manufacturerNames: Map<string, string>,
  moduleLabels: ReadonlyMap<string, string>,
): Promise<BomItem> {
  let manufacturerName: string | null = null;
  let partNumber: string | null = null;
  let sourceRevision: string | null = null;
  let notes: string | null = null;
  let description: string;

  if (assignment.partSource === "catalog") {
    const revision =
      assignment.manufacturerPartRevisionId !== null
        ? await loadManufacturerPartRevision(
            assignment.manufacturerPartRevisionId,
          )
        : null;
    if (revision !== null) {
      let name = manufacturerNames.get(revision.manufacturerId);
      if (name === undefined) {
        const manufacturer = await loadManufacturer(revision.manufacturerId);
        // Falls back to the raw id rather than failing the whole view — the
        // same degrade `describePart` (load-component-assignment-view.ts)
        // already applies.
        name = manufacturer?.name ?? revision.manufacturerId;
        manufacturerNames.set(revision.manufacturerId, name);
      }
      manufacturerName = name;
      partNumber = revision.partNumber;
      sourceRevision = revision.sourceRevision;
      description = `${name} ${revision.partNumber}`;
    } else {
      // Part revisions are write-once and not deleted in normal operation
      // (ADR-0006); a dangling reference degrades to a plain notice rather
      // than failing the whole BOM.
      description = "Catalog part (revision no longer resolves)";
    }
  } else {
    const details = assignment.manualPartDetails;
    description = details?.description ?? "Manual part";
    manufacturerName = details?.manufacturerName ?? null;
    partNumber = details?.partNumber ?? null;
    notes = details?.notes ?? null;
  }

  let calculationRunCreatedAt: Date | null = null;
  if (assignment.calculationRunId !== null) {
    const run = await loadCalculationRun(assignment.calculationRunId, ownerId);
    if (run !== null) {
      calculationRunCreatedAt = run.createdAt;
    }
  }

  const targetLabel =
    assignment.targetKind === "module_instance" &&
    assignment.moduleInstanceId !== null
      ? (moduleLabels.get(assignment.moduleInstanceId) ?? null)
      : null;

  return {
    id: assignment.id,
    targetKind: assignment.targetKind,
    targetLabel,
    partSource: assignment.partSource,
    description,
    manufacturerName,
    partNumber,
    sourceRevision,
    notes,
    quantity: assignment.quantity,
    stale: assignment.stale,
    staleReason: assignment.staleReason,
    calculationRunId: assignment.calculationRunId,
    calculationRunCreatedAt,
  };
}

/** Per-assembly index built from one walk of the tree: which assembly each module instance lives in, and its label. */
interface TreeIndex {
  readonly moduleAssembly: ReadonlyMap<string, string>;
  readonly moduleLabels: ReadonlyMap<string, string>;
}

function indexTree(assemblies: readonly AssemblyNode[]): TreeIndex {
  const moduleAssembly = new Map<string, string>();
  const moduleLabels = new Map<string, string>();
  function visit(node: AssemblyNode): void {
    for (const moduleInstance of node.moduleInstances) {
      moduleAssembly.set(moduleInstance.id, node.id);
      moduleLabels.set(moduleInstance.id, moduleInstance.label);
    }
    for (const child of node.children) {
      visit(child);
    }
  }
  assemblies.forEach(visit);
  return { moduleAssembly, moduleLabels };
}

function buildNode(
  node: AssemblyNode,
  itemsByAssembly: ReadonlyMap<string, readonly BomItem[]>,
): BomNode {
  return {
    assemblyId: node.id,
    assemblyName: node.name,
    items: itemsByAssembly.get(node.id) ?? [],
    children: node.children.map((child) => buildNode(child, itemsByAssembly)),
  };
}

function countLines(nodes: readonly BomNode[]): {
  readonly total: number;
  readonly stale: number;
} {
  let total = 0;
  let stale = 0;
  for (const node of nodes) {
    total += node.items.length;
    stale += node.items.filter((item) => item.stale).length;
    const childCounts = countLines(node.children);
    total += childCounts.total;
    stale += childCounts.stale;
  }
  return { total, stale };
}

/**
 * Generates a configuration's full multi-level BOM, scoped to the owner.
 * Returns `null` when the configuration does not exist or is not owned by
 * `ownerId` — the same "nothing real to render" outcome every other nullable
 * configuration-scoped view in this codebase returns
 * (`loadRequirementsView`, `loadBaselineWorkspaceView`).
 */
export async function loadBomView(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
): Promise<BomView | null> {
  const tree = await loadConfigurationTree(configurationId, ownerId);
  if (tree === null) {
    return null;
  }

  const assignments = await listComponentAssignmentsForConfiguration(
    configurationId,
    ownerId,
  );

  const { moduleAssembly, moduleLabels } = indexTree(tree.assemblies);
  const manufacturerNames = new Map<string, string>();

  const machineLevelItems: BomItem[] = [];
  const itemsByAssembly = new Map<string, BomItem[]>();

  for (const assignment of assignments) {
    const item = await describeBomItem(
      assignment,
      ownerId,
      manufacturerNames,
      moduleLabels,
    );

    const targetAssemblyId: string | null =
      assignment.targetKind === "module_instance"
        ? assignment.moduleInstanceId !== null
          ? (moduleAssembly.get(assignment.moduleInstanceId) ?? null)
          : null
        : assignment.assemblyId;

    if (targetAssemblyId === null) {
      machineLevelItems.push(item);
    } else {
      const bucket = itemsByAssembly.get(targetAssemblyId) ?? [];
      bucket.push(item);
      itemsByAssembly.set(targetAssemblyId, bucket);
    }
  }

  const assemblies = tree.assemblies.map((node) =>
    buildNode(node, itemsByAssembly),
  );
  const treeCounts = countLines(assemblies);
  const totalLineCount = treeCounts.total + machineLevelItems.length;
  const staleLineCount =
    treeCounts.stale + machineLevelItems.filter((item) => item.stale).length;

  return {
    configurationId: tree.id,
    configurationName: tree.name,
    machineLevelItems,
    assemblies,
    totalLineCount,
    staleLineCount,
  };
}
