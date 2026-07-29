import { describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "../values";
import { asSourceRevisionId } from "../../standards/types";
import { TraceError } from "./errors";
import { TRACE_FORMAT_VERSION } from "./format";
import {
  buildCalculationTrace,
  deserializeCalculationTrace,
  serializeCalculationTrace,
  traceStepIds,
  validateCalculationTrace,
  walkTrace,
} from "./trace";
import type { EngineeringValue, Quantity } from "../values";
import type { CalculationTrace, TraceSection, TraceStep } from "./types";

function qty(value: number, unit: string): Quantity {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value, unit };
}

function step(id: string, over: Partial<TraceStep> = {}): TraceStep {
  return {
    node: "step",
    id,
    methodId: `method.${id}`,
    inputs: [],
    outputs: [{ label: "y", value: qty(1, "N") }],
    ...over,
  };
}

// A small but realistic horizontal-axis thrust trace: two nesting levels.
const fixture: CalculationTrace = buildCalculationTrace([
  {
    node: "section",
    id: "load-cases",
    title: "Load cases",
    children: [
      {
        node: "section",
        id: "normal",
        title: "Normal running",
        children: [
          step("friction-force", {
            title: "Friction force",
            methodId: "axis.friction_force",
            expression: "F_f = μ · m · g",
            inputs: [
              { label: "μ", value: qty(0.01, "ratio"), ref: "motion.axis.friction_coefficient" },
              { label: "m", value: qty(12, "kg"), ref: "motion.axis.moving_mass" },
              { label: "g", value: qty(9.80665, "m/s^2") },
            ],
            outputs: [{ label: "F_f", value: qty(1.1768, "N") }],
          }),
          step("thrust", {
            title: "Required thrust",
            methodId: "axis.thrust_force",
            expression: "F = F_f",
            inputs: [{ label: "F_f", value: qty(1.1768, "N"), ref: "friction-force" }],
            outputs: [{ label: "F", value: qty(1.1768, "N") }],
            sources: [
              {
                sourceRevisionId: asSourceRevisionId("us.ansi.b11_0@2023"),
                clause: "6.1",
                label: "load determination",
              },
            ],
          }),
        ],
      },
    ],
  },
]);

describe("trace traversal (nested sections)", () => {
  it("visits sections and steps depth-first in authoring order", () => {
    const order: string[] = [];
    walkTrace(fixture, {
      section: (s, depth) => order.push(`section:${s.id}@${depth}`),
      step: (s, depth) => order.push(`step:${s.id}@${depth}`),
    });
    expect(order).toEqual([
      "section:load-cases@0",
      "section:normal@1",
      "step:friction-force@2",
      "step:thrust@2",
    ]);
  });

  it("collects stable step IDs in order", () => {
    expect(traceStepIds(fixture)).toEqual(["friction-force", "thrust"]);
  });
});

describe("trace invariants", () => {
  it("rejects a duplicate step ID", () => {
    const sections: TraceSection[] = [
      { node: "section", id: "a", title: "A", children: [step("dup"), step("dup")] },
    ];
    expectTraceError(() => buildCalculationTrace(sections), "duplicate_node_id");
  });

  it("rejects a step ID colliding with a section ID", () => {
    const sections: TraceSection[] = [
      { node: "section", id: "shared", title: "A", children: [step("shared")] },
    ];
    expectTraceError(() => buildCalculationTrace(sections), "duplicate_node_id");
  });

  it("rejects a source citation with neither clause nor page", () => {
    const sections: TraceSection[] = [
      {
        node: "section",
        id: "a",
        title: "A",
        children: [
          step("s", { sources: [{ sourceRevisionId: asSourceRevisionId("us.ansi.b11_0@2023") }] }),
        ],
      },
    ];
    expectTraceError(() => buildCalculationTrace(sections), "invalid_source_reference");
  });

  it("accepts a source citation that carries a page instead of a clause", () => {
    const sections: TraceSection[] = [
      {
        node: "section",
        id: "a",
        title: "A",
        children: [
          step("s", { sources: [{ sourceRevisionId: asSourceRevisionId("us.ansi.b11_0@2023"), page: 42 }] }),
        ],
      },
    ];
    expect(() => buildCalculationTrace(sections)).not.toThrow();
  });

  it("rejects a malformed section shape at build time", () => {
    // A section child with a bad discriminator fails structural validation.
    const bad = [{ node: "section", id: "a", title: "A", children: [{ node: "nope" }] }];
    expectTraceError(
      () => buildCalculationTrace(bad as unknown as TraceSection[]),
      "invalid_shape",
    );
  });
});

describe("trace serialization", () => {
  it("round-trips through serialize/deserialize", () => {
    const json = serializeCalculationTrace(fixture);
    expect(deserializeCalculationTrace(json)).toEqual(fixture);
  });

  it("re-validates invariants on deserialize (duplicate IDs)", () => {
    const dup = JSON.stringify({
      v: TRACE_FORMAT_VERSION,
      sections: [{ node: "section", id: "a", title: "A", children: [step("dup"), step("dup")] }],
    });
    expectTraceError(() => deserializeCalculationTrace(dup), "duplicate_node_id");
  });

  it("rejects a trace serialized under a different format version", () => {
    const wrong = JSON.stringify({ ...fixture, v: TRACE_FORMAT_VERSION + 1 });
    expect(() => deserializeCalculationTrace(wrong)).toThrow();
  });

  it("returns the same trace from validateCalculationTrace", () => {
    expect(validateCalculationTrace(fixture)).toBe(fixture);
  });
});

describe("report-from-trace (exit criterion)", () => {
  it("renders an outline from trace data alone, without module compute code", () => {
    const lines: string[] = [];
    const render = (value: EngineeringValue): string =>
      value.kind === "quantity" ? `${value.value} ${value.unit}` : value.kind;
    walkTrace(fixture, {
      section: (s, depth) => lines.push(`${"  ".repeat(depth)}§ ${s.title}`),
      step: (s, depth) => {
        const pad = "  ".repeat(depth);
        lines.push(`${pad}• ${s.title ?? s.id} [${s.methodId}]`);
        if (s.expression) lines.push(`${pad}    ${s.expression}`);
        for (const out of s.outputs) lines.push(`${pad}    → ${out.label} = ${render(out.value)}`);
        for (const src of s.sources ?? []) {
          lines.push(`${pad}    src: ${src.sourceRevisionId} ${src.clause ?? `p.${src.page}`}`);
        }
      },
    });
    expect(lines.join("\n")).toMatchSnapshot();
  });
});

function expectTraceError(fn: () => unknown, code: TraceError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(TraceError);
    expect((error as TraceError).code).toBe(code);
    return;
  }
  throw new Error(`expected TraceError(${code})`);
}
