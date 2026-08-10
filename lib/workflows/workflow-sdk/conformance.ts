// Reusable workflow-definition conformance suite, mirroring
// lib/engine/module-sdk/conformance.ts's own shape: a structured, per-check
// pass/fail/skipped report rather than a single throw, so a test file can
// assert conformance and report every failure at once. This is the roadmap's
// "workflow integration tests" item (context/code-standards.md "Module
// Testing": "Guided-workflow integration tests when applicable").

import { resolveLinkProposals } from "./links";
import { parseWorkflowDefinition } from "./schemas";
import type { WorkflowDefinition, WorkflowRoleInstance } from "./types";

/** Outcome of a single conformance check. */
export type ConformanceStatus = "pass" | "fail" | "skipped";

/** The result of one conformance check. */
export interface ConformanceCheck {
  readonly id: string;
  readonly description: string;
  readonly status: ConformanceStatus;
  readonly detail?: string;
}

/** A conformance report over one workflow definition. */
export interface ConformanceReport {
  readonly workflowId: string;
  readonly workflowVersion: string;
  /** True when no check failed (skipped checks do not fail the report). */
  readonly ok: boolean;
  readonly checks: readonly ConformanceCheck[];
}

/** Options for {@link runWorkflowConformance}. */
export interface ConformanceOptions {
  /**
   * A representative instance for every role the definition declares
   * (including optional roles, to exercise their link rules too). When
   * provided, the `link-rules-resolve` check runs; when absent, it is
   * skipped.
   */
  readonly instances?: readonly WorkflowRoleInstance[];
}

function runCheck(
  id: string,
  description: string,
  fn: () => void,
): ConformanceCheck {
  try {
    fn();
    return { id, description, status: "pass" };
  } catch (error) {
    return {
      id,
      description,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function skipped(
  id: string,
  description: string,
  detail: string,
): ConformanceCheck {
  return { id, description, status: "skipped", detail };
}

function checkRoleReferences(definition: WorkflowDefinition): void {
  const roleIds = new Set(definition.roles.map((r) => r.id));
  const missing: string[] = [];

  for (const rule of definition.linkRules) {
    if (!roleIds.has(rule.fromRoleId)) {
      missing.push(`linkRule "${rule.id}" fromRoleId "${rule.fromRoleId}"`);
    }
    if (!roleIds.has(rule.toRoleId)) {
      missing.push(`linkRule "${rule.id}" toRoleId "${rule.toRoleId}"`);
    }
  }

  for (const rule of definition.completionRules) {
    const roleRefs =
      rule.kind === "no_failing_checks"
        ? rule.roleIds
        : "roleId" in rule
          ? [rule.roleId]
          : [];
    for (const roleId of roleRefs) {
      if (!roleIds.has(roleId)) {
        missing.push(`completionRule "${rule.id}" role "${roleId}"`);
      }
    }
    if (
      rule.kind === "link_confirmed" &&
      !definition.linkRules.some((lr) => lr.id === rule.ruleId)
    ) {
      missing.push(
        `completionRule "${rule.id}" references unknown linkRule "${rule.ruleId}"`,
      );
    }
  }

  for (const rule of definition.checkRules) {
    for (const roleId of rule.roleIds) {
      if (!roleIds.has(roleId)) {
        missing.push(`checkRule "${rule.id}" role "${roleId}"`);
      }
    }
  }

  for (const criterion of definition.comparisonCriteria) {
    if (!roleIds.has(criterion.roleId)) {
      missing.push(
        `comparisonCriteria "${criterion.id}" role "${criterion.roleId}"`,
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(missing.join("; "));
  }
}

function checkSequenceConsistency(definition: WorkflowDefinition): void {
  const roleIds = definition.roles.map((r) => r.id);
  const levelOf = new Map<string, number>();
  definition.sequence.forEach((level, index) => {
    for (const roleId of level) levelOf.set(roleId, index);
  });

  const missingFromSequence = roleIds.filter((id) => !levelOf.has(id));
  if (missingFromSequence.length > 0) {
    throw new Error(
      `Role(s) declared but missing from sequence: ${missingFromSequence.join(", ")}`,
    );
  }
  const extraInSequence = [...levelOf.keys()].filter(
    (id) => !roleIds.includes(id),
  );
  if (extraInSequence.length > 0) {
    throw new Error(
      `Sequence references undeclared role(s): ${extraInSequence.join(", ")}`,
    );
  }

  const violations: string[] = [];
  for (const rule of definition.linkRules) {
    const fromLevel = levelOf.get(rule.fromRoleId);
    const toLevel = levelOf.get(rule.toRoleId);
    if (
      fromLevel !== undefined &&
      toLevel !== undefined &&
      fromLevel >= toLevel
    ) {
      violations.push(
        `linkRule "${rule.id}": fromRole "${rule.fromRoleId}" (level ${fromLevel}) must precede toRole "${rule.toRoleId}" (level ${toLevel})`,
      );
    }
  }
  if (violations.length > 0) {
    throw new Error(violations.join("; "));
  }
}

function checkLinkRulesResolve(
  definition: WorkflowDefinition,
  instances: readonly WorkflowRoleInstance[],
): void {
  const proposals = resolveLinkProposals(definition, instances);
  const applicable = definition.linkRules.filter(
    (rule) =>
      instances.some((i) => i.roleId === rule.fromRoleId) &&
      instances.some((i) => i.roleId === rule.toRoleId),
  );
  const unresolved = applicable.filter(
    (rule) => !proposals.some((p) => p.ruleId === rule.id),
  );
  if (unresolved.length > 0) {
    throw new Error(
      `Link rule(s) resolved to zero proposals despite both roles being present: ${unresolved
        .map((r) => r.id)
        .join(", ")}`,
    );
  }
}

/**
 * Runs the conformance suite over `definition` and returns a structured
 * report. Never throws for a non-conforming definition — every failure is
 * captured as a failing check.
 */
export function runWorkflowConformance(
  definition: WorkflowDefinition,
  options: ConformanceOptions = {},
): ConformanceReport {
  const checks: ConformanceCheck[] = [
    runCheck(
      "definition-shape",
      "The definition validates against its Zod schema.",
      () => {
        parseWorkflowDefinition(definition);
      },
    ),
    runCheck(
      "role-references",
      "Every link/completion/check rule and comparison criterion references a declared role ID.",
      () => checkRoleReferences(definition),
    ),
    runCheck(
      "sequence-consistency",
      "The declared sequence covers every role exactly once and agrees with the dependency edges linkRules implies.",
      () => checkSequenceConsistency(definition),
    ),
  ];

  if (options.instances !== undefined && options.instances.length > 0) {
    const instances = options.instances;
    checks.push(
      runCheck(
        "link-rules-resolve",
        "Every link rule resolves to at least one compatible port pair against the supplied representative instances.",
        () => checkLinkRulesResolve(definition, instances),
      ),
    );
  } else {
    checks.push(
      skipped(
        "link-rules-resolve",
        "Every link rule resolves to at least one compatible port pair against the supplied representative instances.",
        "no representative instances provided",
      ),
    );
  }

  return {
    workflowId: definition.manifest.id,
    workflowVersion: definition.manifest.version,
    ok: checks.every((c) => c.status !== "fail"),
    checks,
  };
}
