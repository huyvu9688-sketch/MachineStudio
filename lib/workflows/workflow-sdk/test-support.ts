// Test-only fixture helpers shared by workflow-sdk's own test files and by
// linear-axis 1.0.0's integration test. Not imported by any production file
// (mirrors lib/modules/test-support.ts's own role for module packages).

import {
  SERIALIZATION_FORMAT_VERSION,
  TRACE_FORMAT_VERSION,
  type CalculationTrace,
  type CheckResult,
  type EnumValue,
  type ModuleComputation,
  type Quantity,
} from "@/lib/engine";

export function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

export function quantity(value: number, unit: string): Quantity {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value, unit };
}

const EMPTY_TRACE: CalculationTrace = { v: TRACE_FORMAT_VERSION, sections: [] };

/** A minimal, valid `ModuleComputation` fixture; override only what a test needs. */
export function fixtureComputation(
  overrides: Partial<ModuleComputation> = {},
): ModuleComputation {
  return {
    outputs: {},
    trace: EMPTY_TRACE,
    checks: [],
    warnings: [],
    assumptions: [],
    validity: [],
    ...overrides,
  };
}

export function passCheck(id: string): CheckResult {
  return { id, status: "pass", message: `${id} passed.` };
}

export function failCheck(id: string): CheckResult {
  return { id, status: "fail", message: `${id} failed.` };
}
