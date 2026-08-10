// Resolves a WorkflowDefinition's declarative link-proposal rules (./types
// WorkflowLinkProposalRule) against the real, present role instances' ports.
// A rule never names a port key directly; resolution enumerates every
// candidate output/input port pair matching the rule's parameterId and runs
// each pair through the engine's own link-compatibility evaluator
// (lib/engine/graph/compatibility.ts, evaluateLinkCompatibility) — that
// evaluator's existing load-case rule already rejects a normal-output ->
// peak-input pair, so per-case pairing needs no bespoke logic here. This is
// what satisfies the Unit 4.8 gate: "All workflow links are derived from
// canonical parameter contracts; no hardcoded database field-to-field wiring
// exists" (context/implementation-map.md).

import {
  asNodeId,
  asScopeId,
  evaluateLinkCompatibility,
  type CompatibilityOptions,
  type GraphNode,
  type LoadCaseCategory,
  type NodeId,
  type ParameterId,
  type ScopeId,
} from "@/lib/engine";
import type {
  WorkflowDefinition,
  WorkflowLinkProposal,
  WorkflowRoleInstance,
} from "./types";

/**
 * The scope every workflow-sdk graph node uses for link-compatibility
 * evaluation. `evaluateLinkCompatibility` never inspects scope (only
 * `suggestSources`'s nearest-scope ranking does), so one constant scope is
 * sufficient here.
 */
const WORKFLOW_SCOPE: ScopeId = asScopeId("workflow-sdk.link-resolution");

/**
 * The node ID convention every workflow-sdk function uses for a role
 * instance's port — `"<instanceId>.<portKey>"`, the same convention each
 * module's own `cross-module-links.test.ts` already uses inline.
 */
export function instancePortNodeId(
  instanceId: string,
  portKey: string,
): NodeId {
  return asNodeId(`${instanceId}.${portKey}`);
}

interface PortLike {
  readonly key: string;
  readonly parameterId: ParameterId;
  readonly loadCase?: LoadCaseCategory;
}

function toGraphNode(
  instanceId: string,
  kind: "module_input" | "module_output",
  port: PortLike,
): GraphNode {
  return {
    id: instancePortNodeId(instanceId, port.key),
    kind,
    parameterId: port.parameterId,
    scopeId: WORKFLOW_SCOPE,
    moduleInstanceId: instanceId,
    ...(port.loadCase !== undefined && { loadCase: port.loadCase }),
  };
}

/**
 * Resolves every {@link WorkflowLinkProposalRule} in `definition` against the
 * present `instances`, returning one {@link WorkflowLinkProposal} per
 * compatible output/input port pair found. Proposals are suggestions only —
 * confirming one is a separate, explicit step (invariant "No silent
 * binding"), tracked by the caller (today: a test; eventually: the
 * application layer).
 */
export function resolveLinkProposals(
  definition: WorkflowDefinition,
  instances: readonly WorkflowRoleInstance[],
  options: CompatibilityOptions = {},
): WorkflowLinkProposal[] {
  const proposals: WorkflowLinkProposal[] = [];

  for (const rule of definition.linkRules) {
    const fromInstances = instances.filter((i) => i.roleId === rule.fromRoleId);
    const toInstances = instances.filter((i) => i.roleId === rule.toRoleId);

    for (const fromInstance of fromInstances) {
      const fromPorts = fromInstance.ports.outputs.filter(
        (p) => p.parameterId === rule.parameterId,
      );
      const source = fromPorts.map((port) => ({
        port,
        node: toGraphNode(fromInstance.instanceId, "module_output", port),
      }));

      for (const toInstance of toInstances) {
        const toPorts = toInstance.ports.inputs.filter(
          (p) => p.parameterId === rule.parameterId,
        );

        for (const { port: fromPort, node: sourceNode } of source) {
          for (const toPort of toPorts) {
            const sinkNode = toGraphNode(
              toInstance.instanceId,
              "module_input",
              toPort,
            );
            const result = evaluateLinkCompatibility(
              sourceNode,
              sinkNode,
              options,
            );
            if (!result.compatible) continue;

            proposals.push({
              ruleId: rule.id,
              fromInstanceId: fromInstance.instanceId,
              fromPortKey: fromPort.key,
              toInstanceId: toInstance.instanceId,
              toPortKey: toPort.key,
              parameterId: rule.parameterId,
              ...(toPort.loadCase !== undefined && {
                loadCase: toPort.loadCase,
              }),
            });
          }
        }
      }
    }
  }

  return proposals;
}

/**
 * A stable string key identifying one resolved proposal — for matching a
 * confirmed link back to the proposal it confirms (`./completion`'s
 * `link_confirmed` rule).
 */
export function linkProposalKey(proposal: WorkflowLinkProposal): string {
  return `${proposal.ruleId}::${proposal.fromInstanceId}.${proposal.fromPortKey}->${proposal.toInstanceId}.${proposal.toPortKey}`;
}
