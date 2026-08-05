// `describeField` — derives a module input field's editable shape from its
// canonical parameter's `valueType`. Split out from `load-module-workspace-
// view.ts` (Unit 3.3) so it has zero `@/lib/db` exposure: that file has an
// unconditional runtime import from `@/lib/db`, which eagerly Zod-validates
// `DATABASE_URL` at import time (`lib/env.ts`) — fine for the DB-gated view
// builder itself, but wrong for a pure function a `DATABASE_URL`-free test
// should be able to import directly. Keeping this file's only import
// type-only (erased at compile time) is what makes that possible.
import type { FrameRequirement, ParameterValueType } from "@/lib/engine";

/** A field's editable shape, derived from its canonical parameter's `valueType`. */
export type ModuleInputFieldDescriptor =
  | {
      readonly kind: "quantity";
      readonly canonicalUnit: string;
      readonly displayUnits: readonly string[];
    }
  | {
      /**
       * A `frame: "axis"` vector (axis.v1: exactly 3 ordered components,
       * X = travel direction, Y = transverse, Z = right-handed). `frame` is
       * narrowed to the literal `"axis"` rather than the full
       * `FrameRequirement` union so a second frame is a visible signature
       * change here, not a silent fallthrough — see
       * docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md.
       */
      readonly kind: "vector_quantity";
      readonly canonicalUnit: string;
      readonly displayUnits: readonly string[];
      readonly frame: "axis";
    }
  | { readonly kind: "enum"; readonly enumId: string; readonly options: readonly string[] }
  | { readonly kind: "boolean" }
  /** A `curve` parameter, or a `vector_quantity` whose frame is not `"axis"`. */
  | { readonly kind: "unsupported"; readonly valueType: ParameterValueType };

export function describeField(valueType: ParameterValueType, definition: {
  readonly canonicalUnit?: string;
  readonly displayUnits?: readonly string[];
  readonly enumId?: string;
  readonly enumOptions?: readonly string[];
  readonly frame?: FrameRequirement;
}): ModuleInputFieldDescriptor {
  switch (valueType) {
    case "quantity": {
      if (definition.canonicalUnit === undefined) {
        throw new Error("Quantity parameter is missing its canonicalUnit.");
      }
      return {
        kind: "quantity",
        canonicalUnit: definition.canonicalUnit,
        displayUnits: definition.displayUnits ?? [definition.canonicalUnit],
      };
    }
    case "enum": {
      if (definition.enumId === undefined) {
        throw new Error("Enum parameter is missing its enumId.");
      }
      return { kind: "enum", enumId: definition.enumId, options: definition.enumOptions ?? [] };
    }
    case "boolean":
      return { kind: "boolean" };
    case "vector_quantity": {
      if (definition.frame !== "axis") {
        return { kind: "unsupported", valueType };
      }
      if (definition.canonicalUnit === undefined) {
        throw new Error("Vector quantity parameter is missing its canonicalUnit.");
      }
      return {
        kind: "vector_quantity",
        canonicalUnit: definition.canonicalUnit,
        displayUnits: definition.displayUnits ?? [definition.canonicalUnit],
        frame: "axis",
      };
    }
    default: {
      const exhaustive: never = valueType;
      return { kind: "unsupported", valueType: exhaustive };
    }
  }
}
