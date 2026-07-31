// The `createMachineProject` use case (Unit 3.2). Creates a `MachineProject`
// and its initial `MachineConfiguration` together, atomically — the first
// mutation this codebase has that touches the project-hierarchy repository's
// creates from lib/application, so `createProject`/`createConfiguration`
// gained the same optional trailing `client` parameter the 2026-07-30
// design-risk follow-up already established for reads.
//
// DECISION (Unit 3.2, recorded in full in context/progress-tracker.md's
// Architecture Decisions): a project always starts with exactly one
// configuration. Nothing in project-overview.md's Guided Design Flow ("User
// creates a machine project ... User creates an assembly or axis") names a
// separate "create a configuration" step, and no work unit's deliverables
// add one either — architecture.md frames `MachineConfiguration` as the
// draft/working state a baseline is later cut from, not something a user
// consciously creates up front.

import "server-only";
import { z } from "zod";
import { marketProfileKey, SOURCE_REGISTRY } from "@/lib/standards";
import {
  createConfiguration,
  createProject,
  prisma,
  upsertUser,
  type MachineConfigurationRecord,
  type MachineProjectRecord,
  type UserId,
} from "@/lib/db";

/** The name given to a project's automatically created first configuration. */
export const INITIAL_CONFIGURATION_NAME = "Working configuration";

/** Machine-readable classification of a {@link createMachineProject} failure. */
export type CreateMachineProjectErrorCode = "invalid_input" | "unknown_market_profile";

/** A failed {@link createMachineProject} outcome. */
export interface CreateMachineProjectError {
  readonly code: CreateMachineProjectErrorCode;
  readonly message: string;
}

/** Input to {@link createMachineProject}. */
export interface CreateMachineProjectInput {
  readonly name: string;
  readonly marketProfileKey: string;
}

/** Result of {@link createMachineProject}. */
export type CreateMachineProjectResult =
  | {
      readonly ok: true;
      readonly project: MachineProjectRecord;
      readonly configuration: MachineConfigurationRecord;
    }
  | { readonly ok: false; readonly error: CreateMachineProjectError };

const inputSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(200),
  marketProfileKey: z.string().trim().min(1, "Select a market profile."),
});

/**
 * Creates a `MachineProject` owned by `ownerId`, plus its initial
 * configuration, in one transaction. `marketProfileKey` must match a
 * released profile in `SOURCE_REGISTRY` (`US-General-Industrial-Machinery@1`
 * or `JP-General-Industrial-Machinery@1` today) — validated against the
 * real registry rather than a hardcoded pair of literals, so this stays
 * correct as market profiles are added.
 *
 * **Also upserts the `User` row for `ownerId`, inside the same
 * transaction, before creating the project.** Nothing else in this
 * codebase ever creates a `User` row for a real (non-test) Clerk user —
 * every test fixture calls `upsertUser` itself, which hid this gap until
 * the first real signed-in browser session hit `machine_projects_ownerId_
 * fkey`. This is the one true "first write" entry point for any given
 * user (every other write path operates on a project/assembly/module
 * instance that could only exist if this function already ran), so fixing
 * it here — rather than in the auth middleware/layout, or repeated in
 * every Server Action — closes the gap for the whole application at its
 * root cause.
 */
export async function createMachineProject(
  input: CreateMachineProjectInput,
  ownerId: UserId,
): Promise<CreateMachineProjectResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      },
    };
  }

  const releasedKeys = new Set(SOURCE_REGISTRY.listProfiles().map(marketProfileKey));
  if (!releasedKeys.has(parsed.data.marketProfileKey)) {
    return {
      ok: false,
      error: {
        code: "unknown_market_profile",
        message: `"${parsed.data.marketProfileKey}" is not a released market profile.`,
      },
    };
  }

  const { project, configuration } = await prisma.$transaction(async (tx) => {
    await upsertUser(ownerId, tx);
    const project = await createProject(
      { ownerId, name: parsed.data.name, marketProfileKey: parsed.data.marketProfileKey },
      tx,
    );
    const configuration = await createConfiguration(
      { projectId: project.id, name: INITIAL_CONFIGURATION_NAME },
      tx,
    );
    return { project, configuration };
  });

  return { ok: true, project, configuration };
}
