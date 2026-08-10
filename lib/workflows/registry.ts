// Hand-maintained workflow registry (Unit 4.8) — no codegen tooling yet
// (context/code-standards.md "General": "Prefer explicit duplication over
// premature abstraction"). Mirrors lib/modules/registry.generated.ts's own
// "<id>@<version>" key convention (lib/engine/module-sdk/registry-codegen.ts
// moduleRegistryKey). Now two entries (Unit 4.9): example-workflow is a
// development fixture (see its own definition.ts header), not a second real
// production workflow — a generator is still worth building only once a
// second *production* workflow exists.

import type { WorkflowDefinition } from "./workflow-sdk";
import { linearAxisDefinition } from "./linear-axis/1.0.0/definition";
import { exampleWorkflowDefinition } from "./example-workflow/1.0.0/definition";

/** Every registered workflow definition, keyed by `"<workflowId>@<version>"`. */
export const WORKFLOW_REGISTRY: Readonly<Record<string, WorkflowDefinition>> = {
  "linear-axis@1.0.0": linearAxisDefinition,
  "example-workflow@1.0.0": exampleWorkflowDefinition,
};
