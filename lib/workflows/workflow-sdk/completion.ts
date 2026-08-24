// Evaluates a WorkflowDefinition's completion rules (./types CompletionRule)
// against a workflow instance's present role instances and confirmed links.
// Pure: every input is supplied by the caller (today: a test fixture;
// eventually: the application layer) — this never queries a database or
// re-derives confirmation state itself (invariant "No silent binding": a
// link counts as confirmed only because the caller says so).

import { isEnumValue } from "@/lib/engine";
import type { Assumption, CheckResult } from "@/lib/engine";
import { linkProposalKey } from "./links";
import { findValueForParameter } from "./instance-values";
import type {
  CompletionRule,
  WorkflowDefinition,
  WorkflowInstanceContext,
  WorkflowLinkProposal,
} from "./types";

/** Input to {@link evaluateCompletion}. */
export interface EvaluateCompletionInput {
  readonly definition: WorkflowDefinition;
  readonly instances: readonly WorkflowInstanceContext[];
  /** Every proposal `resolveLinkProposals` produced for the present instances. */
  readonly proposals: readonly WorkflowLinkProposal[];
  /** The subset of `proposals` (by `linkProposalKey`) the engineer has confirmed. */
  readonly confirmedLinkKeys: ReadonlySet<string>;
  /** Recorded design assumptions, for `conditional_acknowledgment` rules. */
  readonly assumptions?: readonly Assumption[];
  /**
   * The result of `evaluateWorkflowChecks` (`./checks`) for the same
   * instances — workflow-level structural checks (e.g. "these roles must
   * link a shared parameter to the same source"), distinct from any single
   * module's own checks. A release audit found these were computed and
   * shown in the UI but never gated `satisfied`/`"completed"` status at
   * all: a workflow with a failing structural check could still report
   * complete. Optional only so a caller mid-migration (or a unit test
   * exercising completion rules in isolation) is not forced to thread a
   * graph/`evaluateWorkflowChecks` call through — omitting it is a
   * deliberate opt-out, not a silent default.
   */
  readonly workflowChecks?: readonly CheckResult[];
}

/** The outcome of evaluating one {@link CompletionRule}. */
export interface CompletionRuleResult {
  readonly ruleId: string;
  readonly kind: CompletionRule["kind"];
  readonly satisfied: boolean;
  readonly message: string;
}

/** The outcome of evaluating every completion rule in a definition. */
export interface CompletionResult {
  /** True only when every rule is satisfied. */
  readonly satisfied: boolean;
  readonly results: readonly CompletionRuleResult[];
}

function evaluateRoleCardinality(
  rule: Extract<CompletionRule, { kind: "role_cardinality" }>,
  definition: WorkflowDefinition,
  instances: readonly WorkflowInstanceContext[],
): CompletionRuleResult {
  const role = definition.roles.find((r) => r.id === rule.roleId);
  if (role === undefined) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      satisfied: false,
      message: `Rule references unknown role "${rule.roleId}".`,
    };
  }
  const count = instances.filter((i) => i.roleId === rule.roleId).length;
  const satisfied =
    count >= role.cardinality.min &&
    (role.cardinality.max === undefined || count <= role.cardinality.max);
  return {
    ruleId: rule.id,
    kind: rule.kind,
    satisfied,
    message: satisfied
      ? `Role "${rule.roleId}" has ${count} instance(s), within its required cardinality.`
      : `Role "${rule.roleId}" has ${count} instance(s); required ${role.cardinality.min}${
          role.cardinality.max !== undefined ? `-${role.cardinality.max}` : "+"
        }.`,
  };
}

function evaluateLinkConfirmed(
  rule: Extract<CompletionRule, { kind: "link_confirmed" }>,
  proposals: readonly WorkflowLinkProposal[],
  confirmedLinkKeys: ReadonlySet<string>,
): CompletionRuleResult {
  const relevant = proposals.filter((p) => p.ruleId === rule.ruleId);
  const unconfirmed = relevant.filter(
    (p) => !confirmedLinkKeys.has(linkProposalKey(p)),
  );
  return {
    ruleId: rule.id,
    kind: rule.kind,
    satisfied: unconfirmed.length === 0,
    message:
      unconfirmed.length === 0
        ? `All ${relevant.length} proposal(s) for link rule "${rule.ruleId}" are confirmed.`
        : `${unconfirmed.length} of ${relevant.length} proposal(s) for link rule "${rule.ruleId}" are not yet confirmed.`,
  };
}

function evaluateNoFailingChecks(
  rule: Extract<CompletionRule, { kind: "no_failing_checks" }>,
  instances: readonly WorkflowInstanceContext[],
): CompletionRuleResult {
  const relevant = instances.filter((i) => rule.roleIds.includes(i.roleId));
  const notComputed = relevant.filter((i) => i.computation === undefined);
  if (notComputed.length > 0) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      satisfied: false,
      message: `${notComputed.length} instance(s) among roles [${rule.roleIds.join(", ")}] have not been run yet.`,
    };
  }
  const failing = relevant.filter((i) =>
    (i.computation?.checks ?? []).some((c) => c.status === "fail"),
  );
  return {
    ruleId: rule.id,
    kind: rule.kind,
    satisfied: failing.length === 0,
    message:
      failing.length === 0
        ? `No failing checks among roles [${rule.roleIds.join(", ")}].`
        : `${failing.length} instance(s) among roles [${rule.roleIds.join(", ")}] have a failing check.`,
  };
}

function evaluateConditionalAcknowledgment(
  rule: Extract<CompletionRule, { kind: "conditional_acknowledgment" }>,
  instances: readonly WorkflowInstanceContext[],
  assumptions: readonly Assumption[],
): CompletionRuleResult {
  const relevant = instances.filter((i) => i.roleId === rule.roleId);
  const triggered = relevant.some((instance) => {
    const value = findValueForParameter(instance, rule.parameterId);
    return (
      value !== undefined &&
      isEnumValue(value) &&
      value.value === rule.whenValue
    );
  });
  if (!triggered) {
    return {
      ruleId: rule.id,
      kind: rule.kind,
      satisfied: true,
      message: `Condition ("${rule.roleId}".${rule.parameterId} = "${rule.whenValue}") does not apply yet.`,
    };
  }
  const acknowledged = assumptions.some((a) => a.id === rule.acknowledgmentId);
  return {
    ruleId: rule.id,
    kind: rule.kind,
    satisfied: acknowledged,
    message: acknowledged
      ? `Required acknowledgment "${rule.acknowledgmentId}" is recorded.`
      : `Condition ("${rule.roleId}".${rule.parameterId} = "${rule.whenValue}") applies; acknowledgment "${rule.acknowledgmentId}" is not yet recorded.`,
  };
}

/**
 * Evaluates every completion rule in `input.definition` and returns whether
 * the workflow instance may reach `"completed"` status (`./status`).
 */
export function evaluateCompletion(
  input: EvaluateCompletionInput,
): CompletionResult {
  const assumptions = input.assumptions ?? [];
  const results = input.definition.completionRules.map((rule) => {
    switch (rule.kind) {
      case "role_cardinality":
        return evaluateRoleCardinality(rule, input.definition, input.instances);
      case "link_confirmed":
        return evaluateLinkConfirmed(
          rule,
          input.proposals,
          input.confirmedLinkKeys,
        );
      case "no_failing_checks":
        return evaluateNoFailingChecks(rule, input.instances);
      case "conditional_acknowledgment":
        return evaluateConditionalAcknowledgment(
          rule,
          input.instances,
          assumptions,
        );
      default: {
        const exhaustive: never = rule;
        throw new Error(
          `Unhandled completion rule kind: ${JSON.stringify(exhaustive)}`,
        );
      }
    }
  });

  if (input.workflowChecks !== undefined) {
    const failing = input.workflowChecks.filter((c) => c.status === "fail");
    results.push({
      ruleId: "workflow-checks",
      kind: "no_failing_checks",
      satisfied: failing.length === 0,
      message:
        failing.length === 0
          ? `No failing workflow-level checks (${input.workflowChecks.length} evaluated).`
          : `${failing.length} of ${input.workflowChecks.length} workflow-level check(s) are failing: ${failing.map((c) => c.id).join(", ")}.`,
    });
  }

  return {
    satisfied: results.every((r) => r.satisfied),
    results,
  };
}
