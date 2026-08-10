// Evaluates a WorkflowDefinition's workflow-level checks (./types
// WorkflowCheckRule) — distinct from a module's own checks.ts, which only
// ever sees its own inputs and cannot see whether two *different* role
// instances agree on a value that has no single producing module (e.g.
// `screw.lead`, required by four roles with no upstream port — see
// context/adr/0007-workflow-definition-contract.md). Reuses `CheckResult`'s
// existing pass/fail/not_applicable semantics rather than inventing a new
// result shape (context/code-standards.md "Checks and Status").

import type { CheckResult, IndexedParameterGraph } from "@/lib/engine";
import { instancePortNodeId } from "./links";
import type {
  WorkflowCheckRule,
  WorkflowDefinition,
  WorkflowRoleInstance,
} from "./types";

/** Input to {@link evaluateWorkflowChecks}. */
export interface EvaluateWorkflowChecksInput {
  readonly definition: WorkflowDefinition;
  readonly instances: readonly WorkflowRoleInstance[];
  /**
   * The assembled parameter graph for this workflow instance (built with
   * `buildParameterGraph`, using {@link instancePortNodeId} as every port's
   * node ID — the same convention `./links` uses when resolving proposals).
   */
  readonly graph: IndexedParameterGraph;
}

function evaluateSharedValueTopology(
  rule: WorkflowCheckRule,
  instances: readonly WorkflowRoleInstance[],
  graph: IndexedParameterGraph,
): CheckResult {
  const applicable: { instanceId: string; sourceNodeId: string | undefined }[] =
    [];

  for (const inst of instances) {
    if (!rule.roleIds.includes(inst.roleId)) continue;
    const port = inst.ports.inputs.find(
      (p) => p.parameterId === rule.parameterId && p.loadCase === undefined,
    );
    if (port === undefined) continue;
    const nodeId = instancePortNodeId(inst.instanceId, port.key);
    const link = graph.graph.links.find((l) => l.targetNodeId === nodeId);
    applicable.push({
      instanceId: inst.instanceId,
      sourceNodeId: link?.sourceNodeId,
    });
  }

  if (applicable.length < 2) {
    return {
      id: rule.id,
      status: "not_applicable",
      message: `Fewer than two present instances declare "${rule.parameterId}" as an input; nothing to compare.`,
      criterion: `every instance among [${rule.roleIds.join(", ")}] links "${rule.parameterId}" to the same source`,
    };
  }

  const unlinked = applicable.filter((a) => a.sourceNodeId === undefined);
  if (unlinked.length > 0) {
    return {
      id: rule.id,
      status: "fail",
      message: `${unlinked.length} of ${applicable.length} instance(s) have not linked "${rule.parameterId}" to a shared source — a manual entry cannot be proven consistent with the others.`,
      criterion: `every instance among [${rule.roleIds.join(", ")}] links "${rule.parameterId}" to the same source`,
    };
  }

  const distinctSources = new Set(applicable.map((a) => a.sourceNodeId));
  const ok = distinctSources.size === 1;
  return {
    id: rule.id,
    status: ok ? "pass" : "fail",
    message: ok
      ? `All ${applicable.length} instance(s) link "${rule.parameterId}" to the same source.`
      : `Instances link "${rule.parameterId}" to ${distinctSources.size} different sources — values may have diverged.`,
    criterion: `every instance among [${rule.roleIds.join(", ")}] links "${rule.parameterId}" to the same source`,
  };
}

/**
 * Evaluates every workflow-level check rule in `input.definition` against
 * the present instances and the assembled parameter graph.
 */
export function evaluateWorkflowChecks(
  input: EvaluateWorkflowChecksInput,
): CheckResult[] {
  return input.definition.checkRules.map((rule) =>
    evaluateSharedValueTopology(rule, input.instances, input.graph),
  );
}
