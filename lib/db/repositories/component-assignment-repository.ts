// ComponentAssignment persistence adapter (Unit 2.8 part 2).
//
// A `lib/db` repository — the only boundary allowed to import Prisma
// (context/architecture.md "lib/db/"). Unlike the shared-reference catalog
// repository (Unit 2.6), `ComponentAssignment` IS project-scoped: reads here
// filter by owner the same way project/graph/run repositories do.
//
// Two structural rules are validated here, mirroring `graph-repository.ts`'s
// `createParameterLink` discriminator pattern (`ParameterLink.sourceKind`
// plus nullable `sourceModuleInstanceId`/`sourceAssemblyId`):
//   - `targetKind` picks exactly one of `moduleInstanceId`/`assemblyId`.
//   - `partSource` picks exactly one of `manufacturerPartRevisionId`/
//     `manualPartDetails`.
//   - A `"module_instance"` target (a calculated component) requires
//     `calculationRunId` (implementation map: "Supporting run required for
//     calculated components").
// `manualPartDetails` JSONB is validated on write AND read (never trust
// JSONB — context/code-standards.md "Validation").

import "server-only";
import { z } from "zod";
import { ManualPartDetailsSchema } from "../../catalog";
import type { ManualPartDetails } from "../../catalog";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import { asManufacturerPartRevisionId } from "./catalog-types";
import { asCalculationRunId } from "./run-types";
import {
  asAssemblyId,
  asMachineConfigurationId,
  asModuleInstanceId,
  asUserId,
} from "./types";
import type { ModuleInstanceId, UserId } from "./types";
import type {
  ComponentAssignmentId,
  ComponentAssignmentPartSource,
  ComponentAssignmentRecord,
  ComponentAssignmentTargetKind,
  CreateComponentAssignmentInput,
} from "./component-assignment-types";
import { asComponentAssignmentId } from "./component-assignment-types";

/** Machine-readable classification of a component-assignment-repository failure. */
export type ComponentAssignmentRepositoryErrorCode =
  "invalid_input" | "invalid_snapshot";

/** Thrown by the component-assignment repository for validation failures. */
export class ComponentAssignmentRepositoryError extends Error {
  readonly code: ComponentAssignmentRepositoryErrorCode;

  constructor(
    message: string,
    code: ComponentAssignmentRepositoryErrorCode = "invalid_input",
  ) {
    super(message);
    this.name = "ComponentAssignmentRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

const targetKindSchema: z.ZodType<ComponentAssignmentTargetKind> = z.enum([
  "module_instance",
  "assembly",
]);
const partSourceSchema: z.ZodType<ComponentAssignmentPartSource> = z.enum([
  "catalog",
  "manual",
]);

const createComponentAssignmentSchema = z
  .object({
    configurationId: nonEmpty,
    targetKind: targetKindSchema,
    moduleInstanceId: nonEmpty.optional(),
    assemblyId: nonEmpty.optional(),
    partSource: partSourceSchema,
    manufacturerPartRevisionId: nonEmpty.optional(),
    manualPartDetails: ManualPartDetailsSchema.optional(),
    quantity: z.number().int().positive().optional(),
    calculationRunId: nonEmpty.optional(),
    assignedByUserId: nonEmpty.optional(),
  })
  .refine(
    (v) =>
      (v.targetKind === "module_instance") ===
      (v.moduleInstanceId !== undefined),
    {
      message:
        'moduleInstanceId must be set if, and only if, targetKind is "module_instance"',
      path: ["moduleInstanceId"],
    },
  )
  .refine((v) => v.targetKind === "assembly" || v.assemblyId === undefined, {
    message: 'assemblyId may be set only when targetKind is "assembly"',
    path: ["assemblyId"],
  })
  .refine(
    (v) =>
      (v.partSource === "catalog") ===
      (v.manufacturerPartRevisionId !== undefined),
    {
      message:
        'manufacturerPartRevisionId must be set if, and only if, partSource is "catalog"',
      path: ["manufacturerPartRevisionId"],
    },
  )
  .refine(
    (v) => (v.partSource === "manual") === (v.manualPartDetails !== undefined),
    {
      message:
        'manualPartDetails must be set if, and only if, partSource is "manual"',
      path: ["manualPartDetails"],
    },
  )
  .refine(
    (v) =>
      v.targetKind !== "module_instance" || v.calculationRunId !== undefined,
    {
      message:
        'calculationRunId is required when targetKind is "module_instance" (a calculated component)',
      path: ["calculationRunId"],
    },
  );

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ComponentAssignmentRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_input",
    );
  }
  return result.data;
}

/**
 * Validates a `ComponentAssignment.manualPartDetails` payload. `code` is
 * `invalid_input` for an inbound write and `invalid_snapshot` when
 * re-validating a stored row.
 */
function parseManualPartDetails(
  raw: unknown,
  context: string,
  code: "invalid_input" | "invalid_snapshot",
): ManualPartDetails {
  const result = ManualPartDetailsSchema.safeParse(raw);
  if (!result.success) {
    throw new ComponentAssignmentRepositoryError(
      `Invalid manual part details (${context}): ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      code,
    );
  }
  return result.data;
}

// --- Row → record mapper ----------------------------------------------------

interface ComponentAssignmentRow {
  id: string;
  configurationId: string;
  targetKind: ComponentAssignmentTargetKind;
  moduleInstanceId: string | null;
  assemblyId: string | null;
  partSource: ComponentAssignmentPartSource;
  manufacturerPartRevisionId: string | null;
  manualPartDetails: Prisma.JsonValue | null;
  quantity: number;
  calculationRunId: string | null;
  stale: boolean;
  staleReason: string | null;
  assignedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toComponentAssignmentRecord(
  row: ComponentAssignmentRow,
): ComponentAssignmentRecord {
  return {
    id: asComponentAssignmentId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    targetKind: row.targetKind,
    moduleInstanceId:
      row.moduleInstanceId === null
        ? null
        : asModuleInstanceId(row.moduleInstanceId),
    assemblyId: row.assemblyId === null ? null : asAssemblyId(row.assemblyId),
    partSource: row.partSource,
    manufacturerPartRevisionId:
      row.manufacturerPartRevisionId === null
        ? null
        : asManufacturerPartRevisionId(row.manufacturerPartRevisionId),
    // Re-validate the JSONB on read (never trust stored payloads).
    manualPartDetails:
      row.manualPartDetails === null
        ? null
        : parseManualPartDetails(
            row.manualPartDetails,
            `component_assignment ${row.id}`,
            "invalid_snapshot",
          ),
    quantity: row.quantity,
    calculationRunId:
      row.calculationRunId === null
        ? null
        : asCalculationRunId(row.calculationRunId),
    stale: row.stale,
    staleReason: row.staleReason,
    assignedByUserId:
      row.assignedByUserId === null ? null : asUserId(row.assignedByUserId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- Create ------------------------------------------------------------------

/**
 * Persists a new `ComponentAssignment`. `input.manualPartDetails` is
 * validated as a well-formed {@link ManualPartDetails} payload before it is
 * written. Pass `client` (a `$transaction` callback's `tx`) to make this
 * atomic with other writes.
 *
 * @throws {@link ComponentAssignmentRepositoryError} with code `invalid_input`
 *   for a malformed input or a target/part-source shape that does not match
 *   its discriminator.
 */
export async function createComponentAssignment(
  input: CreateComponentAssignmentInput,
  client: DbClient = prisma,
): Promise<ComponentAssignmentRecord> {
  const data = parse(createComponentAssignmentSchema, input);
  const row = await client.componentAssignment.create({
    data: {
      configurationId: data.configurationId,
      targetKind: data.targetKind,
      moduleInstanceId: data.moduleInstanceId ?? null,
      assemblyId: data.assemblyId ?? null,
      partSource: data.partSource,
      manufacturerPartRevisionId: data.manufacturerPartRevisionId ?? null,
      // Omit the key entirely (rather than assigning `null`) when there is no
      // payload, so a nullable JSONB column stores real SQL NULL.
      ...(data.manualPartDetails !== undefined
        ? {
            manualPartDetails:
              data.manualPartDetails as unknown as Prisma.InputJsonValue,
          }
        : {}),
      quantity: data.quantity ?? 1,
      calculationRunId: data.calculationRunId ?? null,
      assignedByUserId: data.assignedByUserId ?? null,
    },
  });
  return toComponentAssignmentRecord(row);
}

// --- Reads (ownership-scoped) ------------------------------------------------

/**
 * Loads a `ComponentAssignment`, scoped to the owner (the filter walks
 * configuration → project → owner). Returns `null` when it does not exist or
 * is not owned by `ownerId`.
 */
export async function loadComponentAssignmentForOwner(
  id: ComponentAssignmentId,
  ownerId: UserId,
): Promise<ComponentAssignmentRecord | null> {
  const parsedId = parse(nonEmpty, id);
  const owner = parse(nonEmpty, ownerId);
  const row = await prisma.componentAssignment.findFirst({
    where: { id: parsedId, configuration: { project: { ownerId: owner } } },
  });
  return row === null ? null : toComponentAssignmentRecord(row);
}

/**
 * Lists a configuration's component assignments (newest first), scoped to the
 * owner. Returns `[]` when the configuration is not owned by `ownerId`.
 */
export async function listComponentAssignmentsForConfiguration(
  configurationId: string,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<ComponentAssignmentRecord[]> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);
  const rows = await client.componentAssignment.findMany({
    where: {
      configurationId: id,
      configuration: { project: { ownerId: owner } },
    },
    // A total order (`id` breaks same-timestamp ties): Unit 2.9's baseline
    // snapshot freezes this list, so two baselines of unchanged data must
    // serialize their assignments identically.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map(toComponentAssignmentRecord);
}

/**
 * Lists one module instance's component assignments (newest first), scoped to
 * the owner. Returns `[]` when the module instance is not owned by `ownerId`.
 * The same total order as {@link listComponentAssignmentsForConfiguration},
 * narrowed to a single target — Unit 3.6's assignment panel renders one
 * module's assignments, not a whole configuration's.
 */
export async function listComponentAssignmentsForModuleInstance(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<ComponentAssignmentRecord[]> {
  const id = parse(nonEmpty, moduleInstanceId);
  const owner = parse(nonEmpty, ownerId);
  const rows = await client.componentAssignment.findMany({
    where: {
      moduleInstanceId: id,
      configuration: { project: { ownerId: owner } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map(toComponentAssignmentRecord);
}

// --- Stale state (transactional propagation) ---------------------------------

/**
 * Marks every not-already-stale `ComponentAssignment` targeting the given
 * module instances stale with `reason`, in one statement — the
 * `ComponentAssignment` counterpart to `run-repository.ts`'s
 * `markRunsStaleForModuleInstances`, closing invariant "Transactional stale
 * propagation": "downstream runs and component assignments become stale in
 * the same transaction as the upstream change." Called from the same
 * transaction as that function (see
 * `lib/application/parameters/stale-propagation.ts`); ownership is
 * authorized by that caller. Returns the number of rows updated; a no-op
 * (`0`) for an empty list.
 */
export async function markComponentAssignmentsStaleForModuleInstances(
  moduleInstanceIds: readonly ModuleInstanceId[],
  reason: string,
  client: DbClient = prisma,
): Promise<number> {
  if (moduleInstanceIds.length === 0) {
    return 0;
  }
  const result = await client.componentAssignment.updateMany({
    where: { moduleInstanceId: { in: [...moduleInstanceIds] }, stale: false },
    data: { stale: true, staleReason: reason },
  });
  return result.count;
}
