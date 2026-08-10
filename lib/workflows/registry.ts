// Hand-maintained workflow registry (Unit 4.8) — no codegen tooling yet,
// since there is exactly one workflow definition; build a generator once a
// second workflow exists (context/code-standards.md "General": "Prefer
// explicit duplication over premature abstraction"). Mirrors
// lib/modules/registry.generated.ts's own "<id>@<version>" key convention
// (lib/engine/module-sdk/registry-codegen.ts moduleRegistryKey).

import type { WorkflowDefinition } from "./workflow-sdk";
import { linearAxisDefinition } from "./linear-axis/1.0.0/definition";

/** Every registered workflow definition, keyed by `"<workflowId>@<version>"`. */
export const WORKFLOW_REGISTRY: Readonly<Record<string, WorkflowDefinition>> = {
  "linear-axis@1.0.0": linearAxisDefinition,
};
