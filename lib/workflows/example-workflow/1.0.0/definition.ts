// example-workflow@1.0.0 — a development fixture (Unit 4.9), NOT a guided
// workflow for real engineering use. It pairs the two registered example
// modules (example-scaffold, example-relay) into a two-role workflow so the
// lib/application workflow-instance wiring can be integration-tested end to
// end against a real database and a real, registered workflow definition
// without needing any of linear-axis@1's seven real modules registered —
// registering those stays deliberately gated behind Unit 4.1's Definition of
// Done (context/progress-tracker.md). Mirrors exactly why example-relay and
// example-scaffold themselves exist (their own manifest.ts file headers):
// proving a generic contract works against a real database before a
// production consumer of it is available.
//
// This file is pure declarative data, the same shape every real
// WorkflowDefinition follows. `./definition.test.ts` confirms every claim
// here against the two real modules' own manifest.ts files.

import { asParameterId } from "@/lib/engine";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-sdk";

const THRUST_FORCE = asParameterId("motion.axis.thrust_force");

export const exampleWorkflowDefinition: WorkflowDefinition = {
  manifest: {
    id: "example-workflow",
    version: "1.0.0",
    title: "Example Workflow (development fixture)",
    description:
      "Pairs example-scaffold and example-relay into a two-role workflow. Not a real engineering workflow — exists only to prove the workflow application-layer wiring generically.",
  },

  roles: [
    {
      id: "example-workflow.source",
      label: "Source",
      moduleIds: ["example-scaffold"],
      cardinality: { min: 1, max: 1 },
    },
    {
      id: "example-workflow.relay",
      label: "Relay",
      moduleIds: ["example-relay"],
      cardinality: { min: 1, max: 1 },
    },
  ],

  sequence: [["example-workflow.source"], ["example-workflow.relay"]],

  linkRules: [
    {
      id: "source-thrust-to-relay",
      parameterId: THRUST_FORCE,
      fromRoleId: "example-workflow.source",
      toRoleId: "example-workflow.relay",
    },
  ],

  completionRules: [
    {
      kind: "role_cardinality",
      id: "source-cardinality",
      roleId: "example-workflow.source",
    },
    {
      kind: "role_cardinality",
      id: "relay-cardinality",
      roleId: "example-workflow.relay",
    },
    {
      kind: "link_confirmed",
      id: "source-thrust-to-relay-linked",
      ruleId: "source-thrust-to-relay",
    },
  ],

  // No workflow-level structural checks: unlike linear-axis@1, this fixture
  // has no parameter shared by more than one role with no producing role, so
  // there is nothing for a shared_value_topology rule to guard here.
  checkRules: [],

  // No candidate-system comparison: this fixture is never used to compare
  // alternative component selections.
  comparisonCriteria: [],
};
