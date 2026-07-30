// Parameter-graph persistence adapter (Unit 2.2): ParameterValue and
// ParameterLink, plus module-input resolution.
//
// A `lib/db` repository — the only boundary allowed to import Prisma
// (context/architecture.md "lib/db/"). Two invariants are enforced here at the
// persistence boundary, reusing the pure engine so the rules live in one place:
//
//   - JSONB is validated on write AND read with the lib/engine/values schema —
//     "never trust JSONB only because the application originally wrote it"
//     (context/code-standards.md "Validation").
//   - A confirmed link can never close a cycle (invariant "Acyclic graph"). We
//     reconstruct the configuration's link graph and call lib/engine/graph's
//     `wouldCreateCycle` before persisting, rather than reimplementing the
//     check. buildParameterGraph adds each module's internal input→output feed
//     edges, so cross-module cycles are caught.
//
// `loadConfigurationGraph` reconstructs the full confirmed-link graph for a
// configuration — used here for the cycle check, and by the stale-propagation
// application service (Unit 2.5, `lib/application/parameters/`) to compute
// downstream impact when a value changes or a link is confirmed/removed. This
// module owns single-write persistence and the input resolution that Unit
// 2.2's exit criterion names; the propagation transaction itself is Unit 2.5.

import "server-only";
import { z } from "zod";
import type {
  GraphLink,
  GraphNode,
  IndexedParameterGraph,
  NodeId,
  ParameterGraph,
} from "../../engine/graph";
import {
  asLinkId,
  asNodeId,
  asScopeId,
  buildParameterGraph,
  wouldCreateCycle,
} from "../../engine/graph";
import { asParameterId } from "../../engine/parameters";
import type { LoadCaseCategory } from "../../engine/parameters";
import type { EngineeringValue } from "../../engine/values";
import { safeParseEngineeringValue } from "../../engine/values";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import type { ModuleInstanceId, UserId } from "./types";
import {
  asAssemblyId,
  asMachineConfigurationId,
  asModuleInstanceId,
} from "./types";
import type {
  CreateParameterLinkInput,
  CreateParameterValueInput,
  ModuleInputPort,
  ParameterLinkRecord,
  ParameterNodeKind,
  ParameterValueRecord,
  ParameterValueSource,
  ResolvedModuleInput,
} from "./graph-types";
import { asParameterLinkId, asParameterValueId } from "./graph-types";

/** Machine-readable classification of a graph-repository failure. */
export type GraphRepositoryErrorCode =
  | "invalid_input"
  | "invalid_snapshot"
  | "cycle"
  | "duplicate_link";

/** Thrown by the graph repository for validation, cycle, or duplicate failures. */
export class GraphRepositoryError extends Error {
  readonly code: GraphRepositoryErrorCode;

  constructor(message: string, code: GraphRepositoryErrorCode) {
    super(message);
    this.name = "GraphRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

const nodeKindSchema: z.ZodType<ParameterNodeKind> = z.enum([
  "machine_requirement",
  "assembly_parameter",
  "workflow_parameter",
  "module_input",
  "module_output",
]);
const valueSourceSchema: z.ZodType<ParameterValueSource> = z.enum([
  "manual",
  "workflow",
]);
const loadCaseSchema: z.ZodType<LoadCaseCategory> = z.enum([
  "normal",
  "peak",
  "holding",
  "emergency_stop",
]);

const createParameterValueSchema = z.object({
  configurationId: nonEmpty,
  assemblyId: nonEmpty.optional(),
  moduleInstanceId: nonEmpty.optional(),
  nodeKind: nodeKindSchema,
  parameterId: nonEmpty,
  loadCase: loadCaseSchema.optional(),
  source: valueSourceSchema,
});

const createParameterLinkSchema = z
  .object({
    configurationId: nonEmpty,
    targetModuleInstanceId: nonEmpty,
    targetParameterId: nonEmpty,
    targetLoadCase: loadCaseSchema.optional(),
    sourceKind: nodeKindSchema,
    sourceModuleInstanceId: nonEmpty.optional(),
    sourceAssemblyId: nonEmpty.optional(),
    sourceParameterId: nonEmpty,
    sourceLoadCase: loadCaseSchema.optional(),
  })
  // A link source is a provider; a module input never provides a value
  // (invariant "direction" in lib/engine/graph). A module-output source must
  // name its owning module instance.
  .refine((v) => v.sourceKind !== "module_input", {
    message: "A link source cannot be a module input",
    path: ["sourceKind"],
  })
  .refine(
    (v) => v.sourceKind !== "module_output" || v.sourceModuleInstanceId !== undefined,
    {
      message: "A module-output source requires sourceModuleInstanceId",
      path: ["sourceModuleInstanceId"],
    },
  );

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new GraphRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_input",
    );
  }
  return result.data;
}

/**
 * Validates a JSONB payload as an `EngineeringValue`. `code` is `invalid_input`
 * for untrusted inbound values (write path) and `invalid_snapshot` for stored
 * values re-validated on read (never trust JSONB — context/code-standards.md).
 */
function parseValue(
  raw: unknown,
  context: string,
  code: "invalid_input" | "invalid_snapshot",
): EngineeringValue {
  const result = safeParseEngineeringValue(raw);
  if (!result.success) {
    throw new GraphRepositoryError(
      `Invalid EngineeringValue (${context}): ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      code,
    );
  }
  return result.data;
}

// --- Row → branded-record mappers ----------------------------------------

interface ParameterValueRow {
  id: string;
  configurationId: string;
  assemblyId: string | null;
  moduleInstanceId: string | null;
  nodeKind: ParameterNodeKind;
  parameterId: string;
  loadCase: LoadCaseCategory | null;
  source: ParameterValueSource;
  value: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}
interface ParameterLinkRow {
  id: string;
  configurationId: string;
  targetModuleInstanceId: string;
  targetParameterId: string;
  targetLoadCase: LoadCaseCategory | null;
  sourceKind: ParameterNodeKind;
  sourceModuleInstanceId: string | null;
  sourceAssemblyId: string | null;
  sourceParameterId: string;
  sourceLoadCase: LoadCaseCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

function toParameterValueRecord(row: ParameterValueRow): ParameterValueRecord {
  return {
    id: asParameterValueId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    assemblyId: row.assemblyId === null ? null : asAssemblyId(row.assemblyId),
    moduleInstanceId:
      row.moduleInstanceId === null ? null : asModuleInstanceId(row.moduleInstanceId),
    nodeKind: row.nodeKind,
    parameterId: row.parameterId,
    loadCase: row.loadCase,
    source: row.source,
    // Re-validate the JSONB on read (never trust stored payloads).
    value: parseValue(row.value, `parameter_value ${row.id}`, "invalid_snapshot"),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toParameterLinkRecord(row: ParameterLinkRow): ParameterLinkRecord {
  return {
    id: asParameterLinkId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    targetModuleInstanceId: asModuleInstanceId(row.targetModuleInstanceId),
    targetParameterId: row.targetParameterId,
    targetLoadCase: row.targetLoadCase,
    sourceKind: row.sourceKind,
    sourceModuleInstanceId:
      row.sourceModuleInstanceId === null
        ? null
        : asModuleInstanceId(row.sourceModuleInstanceId),
    sourceAssemblyId:
      row.sourceAssemblyId === null ? null : asAssemblyId(row.sourceAssemblyId),
    sourceParameterId: row.sourceParameterId,
    sourceLoadCase: row.sourceLoadCase,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- Graph reconstruction (cycle rejection + Unit 2.5 stale propagation) --

/**
 * The identity of a graph node, sufficient to reconstruct it deterministically.
 * Exported so the stale-propagation application service (Unit 2.5) can name a
 * "changed node" — e.g. a module's own port, from its package — the same way a
 * link's persisted endpoints are reconstructed here.
 */
export interface GraphNodeDescriptor {
  readonly kind: ParameterNodeKind;
  readonly moduleInstanceId: string | null;
  readonly assemblyId: string | null;
  readonly parameterId: string;
  readonly loadCase: LoadCaseCategory | null;
}

/**
 * A stable node ID for a descriptor, so the same port maps to the same node
 * across every link. Module ports are keyed by their module instance; provider
 * values by their scope (assembly, or the configuration root).
 */
export function parameterGraphNodeId(descriptor: GraphNodeDescriptor): NodeId {
  const owner =
    descriptor.moduleInstanceId !== null
      ? `m:${descriptor.moduleInstanceId}`
      : `a:${descriptor.assemblyId ?? "root"}`;
  return asNodeId(
    `${descriptor.kind}|${owner}|${descriptor.parameterId}|${descriptor.loadCase ?? ""}`,
  );
}

function targetDescriptor(link: ParameterLinkRow): GraphNodeDescriptor {
  return {
    kind: "module_input",
    moduleInstanceId: link.targetModuleInstanceId,
    assemblyId: null,
    parameterId: link.targetParameterId,
    loadCase: link.targetLoadCase,
  };
}
function sourceDescriptor(link: ParameterLinkRow): GraphNodeDescriptor {
  return {
    kind: link.sourceKind,
    moduleInstanceId: link.sourceModuleInstanceId,
    assemblyId: link.sourceAssemblyId,
    parameterId: link.sourceParameterId,
    loadCase: link.sourceLoadCase,
  };
}

/**
 * Builds a `GraphNode` from a descriptor. All nodes share one synthetic root
 * scope: scope proximity is irrelevant to cycle detection or stale-impact
 * traversal (only suggestion ranking uses it), so a single scope keeps the
 * reconstruction minimal.
 */
function graphNodeOf(descriptor: GraphNodeDescriptor, scopeId: string): GraphNode {
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
 * Reconstructs the full confirmed-link graph for a configuration: every
 * `ParameterLink` row contributes its source and target as nodes, plus each
 * module instance's internal input→output feed edge wherever `buildParameterGraph`
 * finds both a `module_input` and `module_output` node for it. Pass `extraNodes`
 * to guarantee a node is present even though it is not (yet) a link endpoint —
 * e.g. a module's own port that is only ever directly authored, never linked;
 * without it, changing that value would have no node to start the stale-impact
 * traversal from, and — if the changed port is an input and its sibling output
 * is otherwise unlinked — no internal edge to prove the module's own runs are
 * affected.
 *
 * Used here for the cycle check (`createParameterLink`) and by the
 * stale-propagation application service (Unit 2.5).
 */
export async function loadConfigurationGraph(
  configurationId: string,
  extraNodes: readonly GraphNodeDescriptor[] = [],
): Promise<IndexedParameterGraph> {
  const links: ParameterLinkRow[] = await prisma.parameterLink.findMany({
    where: { configurationId },
  });

  const nodesById = new Map<string, GraphNode>();
  const addNode = (descriptor: GraphNodeDescriptor): void => {
    const node = graphNodeOf(descriptor, configurationId);
    nodesById.set(node.id, node);
  };
  for (const link of links) {
    addNode(sourceDescriptor(link));
    addNode(targetDescriptor(link));
  }
  for (const descriptor of extraNodes) {
    addNode(descriptor);
  }

  const graphLinks: GraphLink[] = links.map((link) => ({
    id: asLinkId(link.id),
    sourceNodeId: parameterGraphNodeId(sourceDescriptor(link)),
    targetNodeId: parameterGraphNodeId(targetDescriptor(link)),
  }));

  const graph: ParameterGraph = {
    scopes: [{ id: asScopeId(configurationId) }],
    nodes: [...nodesById.values()],
    links: graphLinks,
  };
  return buildParameterGraph(graph);
}

// --- Creates -------------------------------------------------------------

/**
 * Creates a `ParameterValue`. The `value` payload is validated as an
 * `EngineeringValue` before it is written (invalid input is rejected, not
 * persisted). Pass `client` (a `$transaction` callback's `tx`) to make this
 * atomic with other writes — e.g. Unit 2.5's stale-propagation use cases,
 * which mark downstream runs stale in the same transaction.
 */
export async function createParameterValue(
  input: CreateParameterValueInput,
  client: DbClient = prisma,
): Promise<ParameterValueRecord> {
  const data = parse(createParameterValueSchema, input);
  const value = parseValue(input.value, "createParameterValue", "invalid_input");
  const row = await client.parameterValue.create({
    data: {
      configurationId: data.configurationId,
      assemblyId: data.assemblyId ?? null,
      moduleInstanceId: data.moduleInstanceId ?? null,
      nodeKind: data.nodeKind,
      parameterId: data.parameterId,
      loadCase: data.loadCase ?? null,
      source: data.source,
      value: value as unknown as Prisma.InputJsonValue,
    },
  });
  return toParameterValueRecord(row);
}

/**
 * Creates a confirmed `ParameterLink` after rejecting duplicates (one confirmed
 * source per input port) and cycles. Reconstructs the configuration's link
 * graph and asks lib/engine/graph whether the proposed link would close a cycle.
 * Pass `client` (a `$transaction` callback's `tx`) to make the write atomic
 * with other writes — e.g. Unit 2.5's stale-propagation use cases.
 *
 * @throws {@link GraphRepositoryError} with code `duplicate_link` or `cycle`.
 */
export async function createParameterLink(
  input: CreateParameterLinkInput,
  client: DbClient = prisma,
): Promise<ParameterLinkRecord> {
  const data = parse(createParameterLinkSchema, input);

  const existing: ParameterLinkRow[] = await prisma.parameterLink.findMany({
    where: { configurationId: data.configurationId },
  });

  // One confirmed source per input port (also enforced by the DB unique index;
  // this yields a typed error instead of a raw constraint violation).
  const sameTarget = existing.some(
    (l) =>
      l.targetModuleInstanceId === data.targetModuleInstanceId &&
      l.targetParameterId === data.targetParameterId &&
      (l.targetLoadCase ?? null) === (data.targetLoadCase ?? null),
  );
  if (sameTarget) {
    throw new GraphRepositoryError(
      `Input port already has a confirmed link (${data.targetParameterId})`,
      "duplicate_link",
    );
  }

  const proposedTarget: GraphNodeDescriptor = {
    kind: "module_input",
    moduleInstanceId: data.targetModuleInstanceId,
    assemblyId: null,
    parameterId: data.targetParameterId,
    loadCase: data.targetLoadCase ?? null,
  };
  const proposedSource: GraphNodeDescriptor = {
    kind: data.sourceKind,
    moduleInstanceId: data.sourceModuleInstanceId ?? null,
    assemblyId: data.sourceAssemblyId ?? null,
    parameterId: data.sourceParameterId,
    loadCase: data.sourceLoadCase ?? null,
  };

  // Reconstruct the graph from the persisted links plus the proposed endpoints
  // (the endpoints must be present so buildParameterGraph can add the modules'
  // internal input→output edges), but NOT the proposed link itself.
  const indexed = await loadConfigurationGraph(data.configurationId, [
    proposedSource,
    proposedTarget,
  ]);

  if (
    wouldCreateCycle(
      indexed,
      parameterGraphNodeId(proposedSource),
      parameterGraphNodeId(proposedTarget),
    )
  ) {
    throw new GraphRepositoryError(
      `Link from ${data.sourceParameterId} to ${data.targetParameterId} would create a cycle`,
      "cycle",
    );
  }

  const row = await client.parameterLink.create({
    data: {
      configurationId: data.configurationId,
      targetModuleInstanceId: data.targetModuleInstanceId,
      targetParameterId: data.targetParameterId,
      targetLoadCase: data.targetLoadCase ?? null,
      sourceKind: data.sourceKind,
      sourceModuleInstanceId: data.sourceModuleInstanceId ?? null,
      sourceAssemblyId: data.sourceAssemblyId ?? null,
      sourceParameterId: data.sourceParameterId,
      sourceLoadCase: data.sourceLoadCase ?? null,
    },
  });
  return toParameterLinkRecord(row);
}

// --- Ownership-scoped read + delete (Unit 2.5) ---------------------------

/**
 * Loads a confirmed `ParameterLink`, scoped to the owner (the filter walks
 * configuration → project → owner). Returns `null` when the link does not
 * exist or is not owned by `ownerId`. Unit 2.5's `removeParameterLink` needs
 * the link's target endpoint before it can compute stale impact.
 */
export async function loadParameterLinkForOwner(
  linkId: string,
  ownerId: UserId,
): Promise<ParameterLinkRecord | null> {
  const id = parse(nonEmpty, linkId);
  const owner = parse(nonEmpty, ownerId);
  const row = await prisma.parameterLink.findFirst({
    where: { id, configuration: { project: { ownerId: owner } } },
  });
  return row === null ? null : toParameterLinkRecord(row);
}

/**
 * Deletes a confirmed `ParameterLink`, scoped to the owner in the same query
 * (no separate authorization read needed). Returns `true` when a row was
 * deleted, `false` when nothing matched (wrong owner or unknown id).
 */
export async function deleteParameterLink(
  linkId: string,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<boolean> {
  const id = parse(nonEmpty, linkId);
  const owner = parse(nonEmpty, ownerId);
  const result = await client.parameterLink.deleteMany({
    where: { id, configuration: { project: { ownerId: owner } } },
  });
  return result.count > 0;
}

// --- Configuration-wide reads (Unit 2.9) ----------------------------------

/**
 * Lists a configuration's confirmed parameter links, scoped to the owner.
 * Unlike `ParameterValue`, a link is never edited in place (only created or
 * deleted), so every row returned is exactly the current state — no
 * latest-per-node resolution needed, unlike
 * {@link listCurrentParameterValuesForConfiguration}. Returns `[]` when the
 * configuration is not owned by `ownerId`.
 */
export async function listParameterLinksForConfiguration(
  configurationId: string,
  ownerId: UserId,
): Promise<ParameterLinkRecord[]> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);
  const rows: ParameterLinkRow[] = await prisma.parameterLink.findMany({
    where: { configurationId: id, configuration: { project: { ownerId: owner } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toParameterLinkRecord);
}

/**
 * Lists the *current* value at every graph node in a configuration, scoped to
 * the owner. `ParameterValue` rows are append-only history (Unit 2.2/2.5:
 * changing a value creates a new row rather than editing one), so this
 * resolves each node (identified the same way {@link parameterGraphNodeId}
 * would) to its single latest row rather than returning the full history —
 * the shape Unit 2.9's baseline snapshot needs ("parameter values ... in
 * effect at baseline creation"). Returns `[]` when the configuration is not
 * owned by `ownerId`.
 */
export async function listCurrentParameterValuesForConfiguration(
  configurationId: string,
  ownerId: UserId,
): Promise<ParameterValueRecord[]> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);
  const rows: ParameterValueRow[] = await prisma.parameterValue.findMany({
    where: { configurationId: id, configuration: { project: { ownerId: owner } } },
    orderBy: { createdAt: "desc" },
  });

  const latestByNode = new Map<string, ParameterValueRow>();
  for (const row of rows) {
    const key = `${row.nodeKind}|${row.moduleInstanceId ?? ""}|${row.assemblyId ?? ""}|${row.parameterId}|${row.loadCase ?? ""}`;
    // Rows are ordered newest first, so the first row seen per node is the
    // current one; later duplicates are superseded history.
    if (!latestByNode.has(key)) {
      latestByNode.set(key, row);
    }
  }
  return [...latestByNode.values()].map(toParameterValueRecord);
}

// --- Input resolution (ownership-scoped) ---------------------------------

function portKey(parameterId: string, loadCase: LoadCaseCategory | null): string {
  return `${parameterId}|${loadCase ?? ""}`;
}

/**
 * Resolves each declared input port of a module instance to exactly one of the
 * four input sources (manual, workflow, linked, default), scoped to the owner.
 * Returns `null` when the module instance does not exist or is not owned by
 * `ownerId` (ownership isolation).
 *
 * `inputPorts` is supplied by the caller (the application layer, which holds the
 * module package), so the repository never imports the module registry. This is
 * Unit 2.2's exit criterion: "A module instance can resolve manual, default,
 * workflow, and linked input sources."
 */
export async function resolveModuleInputs(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
  inputPorts: readonly ModuleInputPort[],
): Promise<ResolvedModuleInput[] | null> {
  const id = parse(nonEmpty, moduleInstanceId);
  const owner = parse(nonEmpty, ownerId);

  const owned = await prisma.moduleInstance.findFirst({
    where: {
      id,
      assembly: { configuration: { project: { ownerId: owner } } },
    },
    select: { id: true },
  });
  if (owned === null) {
    return null;
  }

  const linkRows: ParameterLinkRow[] = await prisma.parameterLink.findMany({
    where: { targetModuleInstanceId: id },
  });
  const valueRows: ParameterValueRow[] = await prisma.parameterValue.findMany({
    where: { moduleInstanceId: id, nodeKind: "module_input" },
  });

  const linksByPort = new Map<string, ParameterLinkRow>();
  for (const link of linkRows) {
    linksByPort.set(portKey(link.targetParameterId, link.targetLoadCase), link);
  }
  const valuesByPort = new Map<string, ParameterValueRow>();
  for (const value of valueRows) {
    valuesByPort.set(portKey(value.parameterId, value.loadCase), value);
  }

  const resolved: ResolvedModuleInput[] = [];
  for (const port of inputPorts) {
    const loadCase = port.loadCase ?? null;
    const key = portKey(port.parameterId, loadCase);

    const link = linksByPort.get(key);
    if (link !== undefined) {
      resolved.push({
        parameterId: port.parameterId,
        loadCase,
        resolved: {
          source: "linked",
          link: toParameterLinkRecord(link),
          value: await resolveLinkedSourceValue(link),
        },
      });
      continue;
    }

    const authored = valuesByPort.get(key);
    if (authored !== undefined) {
      resolved.push({
        parameterId: port.parameterId,
        loadCase,
        resolved: {
          source: authored.source,
          value: parseValue(
            authored.value,
            `parameter_value ${authored.id}`,
            "invalid_snapshot",
          ),
        },
      });
      continue;
    }

    resolved.push({
      parameterId: port.parameterId,
      loadCase,
      resolved: { source: "default" },
    });
  }
  return resolved;
}

/**
 * The value a link resolves to. A provider value (requirement / assembly /
 * workflow) resolves to its authored `EngineeringValue`; a module-output source
 * resolves to `null` here — its value comes from that module's calculation run,
 * wired in the execution service (Unit 2.4).
 */
async function resolveLinkedSourceValue(
  link: ParameterLinkRow,
): Promise<EngineeringValue | null> {
  if (link.sourceModuleInstanceId !== null) {
    return null;
  }
  const provider = await prisma.parameterValue.findFirst({
    where: {
      configurationId: link.configurationId,
      moduleInstanceId: null,
      assemblyId: link.sourceAssemblyId,
      nodeKind: link.sourceKind,
      parameterId: link.sourceParameterId,
      loadCase: link.sourceLoadCase,
    },
    orderBy: { createdAt: "desc" },
  });
  if (provider === null) {
    return null;
  }
  return parseValue(
    provider.value,
    `parameter_value ${provider.id}`,
    "invalid_snapshot",
  );
}
