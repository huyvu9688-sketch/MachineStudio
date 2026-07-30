// Requirements persistence adapter (Unit 2.2): Requirement,
// AcceptanceCriterion, DesignAssumption, and LoadCase.
//
// A `lib/db` repository — the only boundary allowed to import Prisma
// (context/architecture.md "lib/db/"). Following the Unit 2.1 pattern, create
// functions validate their input at the persistence boundary and trust the
// caller for ownership; the list reads are ownership-scoped (they filter
// through configuration → project → owner) so one user can never read another
// user's design intent (context/code-standards.md "Security").

import "server-only";
import { z } from "zod";
import type { LoadCaseCategory } from "../../engine/parameters";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import type { MachineConfigurationId, UserId } from "./types";
import {
  asAssemblyId,
  asMachineConfigurationId,
} from "./types";
import type {
  AcceptanceCriterionRecord,
  CreateAcceptanceCriterionInput,
  CreateDesignAssumptionInput,
  CreateLoadCaseInput,
  CreateRequirementInput,
  DesignAssumptionRecord,
  LoadCaseRecord,
  RequirementNode,
  RequirementRecord,
} from "./requirements-types";
import {
  asAcceptanceCriterionId,
  asDesignAssumptionId,
  asLoadCaseId,
  asRequirementId,
} from "./requirements-types";

/** Machine-readable classification of a requirements-repository failure. */
export type RequirementsRepositoryErrorCode = "invalid_input";

/** Thrown when a requirements-repository input fails boundary validation. */
export class RequirementsRepositoryError extends Error {
  readonly code: RequirementsRepositoryErrorCode;

  constructor(
    message: string,
    code: RequirementsRepositoryErrorCode = "invalid_input",
  ) {
    super(message);
    this.name = "RequirementsRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

const loadCaseCategorySchema: z.ZodType<LoadCaseCategory> = z.enum([
  "normal",
  "peak",
  "holding",
  "emergency_stop",
]);

const createRequirementSchema = z.object({
  configurationId: nonEmpty,
  assemblyId: nonEmpty.optional(),
  code: nonEmpty,
  statement: nonEmpty,
});
const createAcceptanceCriterionSchema = z.object({
  requirementId: nonEmpty,
  statement: nonEmpty,
});
const createDesignAssumptionSchema = z.object({
  configurationId: nonEmpty,
  assemblyId: nonEmpty.optional(),
  statement: nonEmpty,
  rationale: nonEmpty.optional(),
});
const createLoadCaseSchema = z.object({
  configurationId: nonEmpty,
  category: loadCaseCategorySchema,
  label: nonEmpty,
  description: nonEmpty.optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new RequirementsRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

// --- Row → branded-record mappers ----------------------------------------

interface RequirementRow {
  id: string;
  configurationId: string;
  assemblyId: string | null;
  code: string;
  statement: string;
  createdAt: Date;
  updatedAt: Date;
}
interface AcceptanceCriterionRow {
  id: string;
  requirementId: string;
  statement: string;
  createdAt: Date;
  updatedAt: Date;
}
interface DesignAssumptionRow {
  id: string;
  configurationId: string;
  assemblyId: string | null;
  statement: string;
  rationale: string | null;
  createdAt: Date;
  updatedAt: Date;
}
interface LoadCaseRow {
  id: string;
  configurationId: string;
  category: LoadCaseCategory;
  label: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toRequirementRecord(row: RequirementRow): RequirementRecord {
  return {
    id: asRequirementId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    assemblyId: row.assemblyId === null ? null : asAssemblyId(row.assemblyId),
    code: row.code,
    statement: row.statement,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toAcceptanceCriterionRecord(
  row: AcceptanceCriterionRow,
): AcceptanceCriterionRecord {
  return {
    id: asAcceptanceCriterionId(row.id),
    requirementId: asRequirementId(row.requirementId),
    statement: row.statement,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toDesignAssumptionRecord(
  row: DesignAssumptionRow,
): DesignAssumptionRecord {
  return {
    id: asDesignAssumptionId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    assemblyId: row.assemblyId === null ? null : asAssemblyId(row.assemblyId),
    statement: row.statement,
    rationale: row.rationale,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toLoadCaseRecord(row: LoadCaseRow): LoadCaseRecord {
  return {
    id: asLoadCaseId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    category: row.category,
    label: row.label,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- Creates -------------------------------------------------------------

/** Creates a `Requirement`; omit `assemblyId` for a machine-level requirement. */
export async function createRequirement(
  input: CreateRequirementInput,
): Promise<RequirementRecord> {
  const data = parse(createRequirementSchema, input);
  const row = await prisma.requirement.create({
    data: {
      configurationId: data.configurationId,
      assemblyId: data.assemblyId ?? null,
      code: data.code,
      statement: data.statement,
    },
  });
  return toRequirementRecord(row);
}

/** Creates an `AcceptanceCriterion` under a requirement. */
export async function createAcceptanceCriterion(
  input: CreateAcceptanceCriterionInput,
): Promise<AcceptanceCriterionRecord> {
  const data = parse(createAcceptanceCriterionSchema, input);
  const row = await prisma.acceptanceCriterion.create({ data });
  return toAcceptanceCriterionRecord(row);
}

/** Creates a `DesignAssumption`; omit `assemblyId` for a machine-level one. */
export async function createDesignAssumption(
  input: CreateDesignAssumptionInput,
): Promise<DesignAssumptionRecord> {
  const data = parse(createDesignAssumptionSchema, input);
  const row = await prisma.designAssumption.create({
    data: {
      configurationId: data.configurationId,
      assemblyId: data.assemblyId ?? null,
      statement: data.statement,
      rationale: data.rationale ?? null,
    },
  });
  return toDesignAssumptionRecord(row);
}

/** Creates a `LoadCase` for a configuration. */
export async function createLoadCase(
  input: CreateLoadCaseInput,
): Promise<LoadCaseRecord> {
  const data = parse(createLoadCaseSchema, input);
  const row = await prisma.loadCase.create({
    data: {
      configurationId: data.configurationId,
      category: data.category,
      label: data.label,
      description: data.description ?? null,
    },
  });
  return toLoadCaseRecord(row);
}

// --- Reads (ownership-scoped) --------------------------------------------

/**
 * Lists a configuration's requirements (with acceptance criteria), scoped to
 * the owner: the filter walks configuration → project → owner, so a stranger
 * receives an empty list even for a real configuration ID.
 */
export async function listRequirements(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<RequirementNode[]> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);
  const rows = await client.requirement.findMany({
    where: { configurationId: id, configuration: { project: { ownerId: owner } } },
    orderBy: { createdAt: "asc" },
    include: { acceptanceCriteria: { orderBy: { createdAt: "asc" } } },
  });
  return rows.map((row) => ({
    ...toRequirementRecord(row),
    acceptanceCriteria: row.acceptanceCriteria.map(toAcceptanceCriterionRecord),
  }));
}

/** Lists a configuration's design assumptions, scoped to the owner. */
export async function listDesignAssumptions(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<DesignAssumptionRecord[]> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);
  const rows = await client.designAssumption.findMany({
    where: { configurationId: id, configuration: { project: { ownerId: owner } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDesignAssumptionRecord);
}

/** Lists a configuration's load cases, scoped to the owner. */
export async function listLoadCases(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<LoadCaseRecord[]> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);
  const rows = await client.loadCase.findMany({
    where: { configurationId: id, configuration: { project: { ownerId: owner } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toLoadCaseRecord);
}
