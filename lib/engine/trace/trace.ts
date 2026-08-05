// Calculation-trace construction, traversal, validation, and serialization
// (Unit 1.5). Shape validation lives in ./schemas; this module adds the trace
// invariants (context/code-standards.md "Calculation Trace"):
//  - stable step/section IDs that are unique within one trace
//  - every source citation resolves to an exact location (a clause or a page)
//
// The trace is the report-renderable artifact: `walkTrace` visits nodes in
// authoring order so a report or an audit can be produced from trace data
// without importing any module's compute code (Unit 1.5 exit criterion).

import { TraceError } from "./errors";
import { TRACE_FORMAT_VERSION } from "./format";
import { parseCalculationTrace, safeParseCalculationTrace } from "./schemas";
import type {
  CalculationTrace,
  TraceNode,
  TraceSection,
  TraceStep,
} from "./types";

/** Visitor callbacks for {@link walkTrace}. `depth` is 0 for top-level sections. */
export interface TraceVisitor {
  /** Called when entering a section, before its children. */
  readonly section?: (section: TraceSection, depth: number) => void;
  /** Called for each step, in authoring order. */
  readonly step?: (step: TraceStep, depth: number) => void;
}

function isSection(node: TraceNode): node is TraceSection {
  return node.node === "section";
}

/**
 * Depth-first, in-order traversal of a calculation trace. Sections are visited
 * before their children; siblings are visited in authoring order. Used by
 * reports, audits, and validation to consume trace data generically.
 */
export function walkTrace(
  trace: CalculationTrace,
  visitor: TraceVisitor,
): void {
  const visitNode = (node: TraceNode, depth: number): void => {
    if (isSection(node)) {
      visitor.section?.(node, depth);
      for (const child of node.children) visitNode(child, depth + 1);
    } else {
      visitor.step?.(node, depth);
    }
  };
  for (const section of trace.sections) visitNode(section, 0);
}

/** Every step ID in the trace, in authoring order. */
export function traceStepIds(trace: CalculationTrace): string[] {
  const ids: string[] = [];
  walkTrace(trace, { step: (step) => ids.push(step.id) });
  return ids;
}

/**
 * Asserts the trace invariants beyond structural shape: node IDs are unique
 * across the whole trace, and every step's source citations resolve to an exact
 * location. Returns the same trace for chaining.
 *
 * @throws {@link TraceError} (`duplicate_node_id`) on a repeated step/section
 *   ID, or (`invalid_source_reference`) on a citation with neither clause nor
 *   page.
 */
export function validateCalculationTrace(
  trace: CalculationTrace,
): CalculationTrace {
  const seen = new Set<string>();
  const checkId = (id: string): void => {
    if (seen.has(id)) {
      throw new TraceError(
        "duplicate_node_id",
        `Duplicate trace node ID "${id}".`,
        id,
      );
    }
    seen.add(id);
  };
  walkTrace(trace, {
    section: (section) => checkId(section.id),
    step: (step) => {
      checkId(step.id);
      for (const ref of step.sources ?? []) {
        if (ref.clause === undefined && ref.page === undefined) {
          throw new TraceError(
            "invalid_source_reference",
            `Step "${step.id}" cites revision "${ref.sourceRevisionId}" with neither clause nor page.`,
            step.id,
          );
        }
      }
    },
  });
  return trace;
}

/**
 * Builds a validated {@link CalculationTrace} from top-level sections, stamping
 * the current {@link TRACE_FORMAT_VERSION}. Re-validates the shape and asserts
 * the trace invariants.
 *
 * @throws {@link TraceError} (`invalid_shape`) on a malformed section, or the
 *   invariant errors from {@link validateCalculationTrace}.
 */
export function buildCalculationTrace(
  sections: readonly TraceSection[],
): CalculationTrace {
  const result = safeParseCalculationTrace({
    v: TRACE_FORMAT_VERSION,
    sections,
  });
  if (!result.success) {
    throw new TraceError(
      "invalid_shape",
      `Malformed calculation trace: ${result.error.message}`,
    );
  }
  return validateCalculationTrace(result.data);
}

/** Serializes a {@link CalculationTrace} to a canonical JSON string. */
export function serializeCalculationTrace(trace: CalculationTrace): string {
  return JSON.stringify(trace);
}

/**
 * Parses a JSON string produced by {@link serializeCalculationTrace} back into a
 * validated trace: structural shape, format version, and trace invariants.
 * Throws on malformed JSON, a shape/version mismatch, or an invariant violation.
 */
export function deserializeCalculationTrace(json: string): CalculationTrace {
  return validateCalculationTrace(parseCalculationTrace(JSON.parse(json)));
}
