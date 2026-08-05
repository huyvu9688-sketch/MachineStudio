import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SERIALIZATION_FORMAT_VERSION } from "../values";
import { asSourceRevisionId } from "../../standards/types";
import {
  CalculationTraceSchema,
  parseCalculationTrace,
  parseCheckResult,
  parseValidityResult,
  parseWarning,
} from "./schemas";
import { TRACE_FORMAT_VERSION } from "./format";
import type { Quantity } from "../values";
import type { CalculationTrace, TraceStep } from "./types";

function qty(value: number, unit: string): Quantity {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value, unit };
}

const step: TraceStep = {
  node: "step",
  id: "s1",
  methodId: "m.1",
  inputs: [{ label: "m", value: qty(12, "kg") }],
  outputs: [{ label: "F", value: qty(117.7, "N") }],
};

const trace: CalculationTrace = {
  v: TRACE_FORMAT_VERSION,
  sections: [{ node: "section", id: "sec1", title: "Load", children: [step] }],
};

describe("trace shape validation", () => {
  it("accepts a minimal valid trace", () => {
    expect(() => parseCalculationTrace(trace)).not.toThrow();
  });

  it("rejects a trace written under a different format version", () => {
    const result = CalculationTraceSchema.safeParse({
      ...trace,
      v: TRACE_FORMAT_VERSION + 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key (strict object)", () => {
    const result = CalculationTraceSchema.safeParse({ ...trace, extra: true });
    expect(result.success).toBe(false);
  });

  it("rejects a node with an unknown discriminator", () => {
    const bad = {
      v: TRACE_FORMAT_VERSION,
      sections: [
        {
          node: "section",
          id: "x",
          title: "T",
          children: [{ node: "widget" }],
        },
      ],
    };
    expect(CalculationTraceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a step whose operand carries no engineering value", () => {
    const bad = {
      v: TRACE_FORMAT_VERSION,
      sections: [
        {
          node: "section",
          id: "sec1",
          title: "Load",
          children: [{ ...step, inputs: [{ label: "m" }] }],
        },
      ],
    };
    expect(CalculationTraceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty step ID", () => {
    const bad = {
      ...trace,
      sections: [
        {
          node: "section",
          id: "s",
          title: "T",
          children: [{ ...step, id: "" }],
        },
      ],
    };
    expect(CalculationTraceSchema.safeParse(bad).success).toBe(false);
  });
});

describe("check / warning / validity shape validation", () => {
  it("accepts a well-formed check result with a source citation", () => {
    const check = parseCheckResult({
      id: "static-safety",
      status: "pass",
      message: "Static safety factor adequate",
      criterion: "SF_s ≥ 2.0",
      observed: qty(3.1, "ratio"),
      allowable: qty(2.0, "ratio"),
      sources: [
        {
          sourceRevisionId: asSourceRevisionId("us.ansi.b11_0@2023"),
          clause: "6.1",
        },
      ],
    });
    expect(check.status).toBe("pass");
  });

  it("rejects a check with an unknown status", () => {
    expect(() =>
      parseCheckResult({ id: "c", status: "maybe", message: "m" }),
    ).toThrow(z.ZodError);
  });

  it("rejects a check with an empty message", () => {
    expect(() =>
      parseCheckResult({ id: "c", status: "pass", message: "" }),
    ).toThrow(z.ZodError);
  });

  it("accepts a warning and rejects an empty ID", () => {
    expect(
      parseWarning({
        id: "near-critical",
        message: "operating near critical speed",
      }).id,
    ).toBe("near-critical");
    expect(() => parseWarning({ id: "", message: "m" })).toThrow(z.ZodError);
  });

  it("accepts each validity status and rejects an invalid one", () => {
    for (const status of [
      "within_limits",
      "out_of_range",
      "not_evaluated",
    ] as const) {
      expect(parseValidityResult({ id: "v", status, limit: "L" }).status).toBe(
        status,
      );
    }
    expect(() =>
      parseValidityResult({ id: "v", status: "unknown", limit: "L" }),
    ).toThrow(z.ZodError);
  });
});
