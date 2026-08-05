import { convert } from "@/lib/engine/units";
import {
  SERIALIZATION_FORMAT_VERSION,
  type VectorQuantity,
} from "@/lib/engine/values";

export type SubmittedVectorParseResult =
  | { readonly ok: true; readonly value: VectorQuantity }
  | { readonly ok: false; readonly message: string };

/**
 * Parses three submitted magnitude strings (one shared unit across all of
 * them, matching `VectorQuantity.unit`/`displayUnit`) into a canonical
 * `VectorQuantity`. Mirrors `parseSubmittedQuantity` component-wise: any
 * blank or non-finite component rejects the whole submission rather than
 * storing a partial vector (docs/superpowers/specs/
 * 2026-08-05-vector-quantity-input-editor-design.md, "Validation" — the
 * generalized form of Unit 3.9's Defect 3 guard).
 */
export function parseSubmittedVector(
  rawComponents: readonly string[],
  rawUnit: string,
  canonicalUnit: string,
  frame: "axis",
): SubmittedVectorParseResult {
  const components: number[] = [];
  for (const raw of rawComponents) {
    const text = raw.trim();
    if (text.length === 0) {
      return { ok: false, message: "Enter a numeric value." };
    }
    const magnitude = Number(text);
    if (!Number.isFinite(magnitude)) {
      return { ok: false, message: "Enter a numeric value." };
    }
    components.push(magnitude);
  }

  const unit = rawUnit || canonicalUnit;
  try {
    const convertedComponents = components.map((component) =>
      convert(component, unit, canonicalUnit),
    );
    if (!convertedComponents.every((component) => Number.isFinite(component))) {
      return {
        ok: false,
        message: `Unit "${unit}" is not valid for this value.`,
      };
    }
    return {
      ok: true,
      value: {
        v: SERIALIZATION_FORMAT_VERSION,
        kind: "vector_quantity",
        components: convertedComponents,
        unit: canonicalUnit,
        frame,
        displayUnit: unit,
      },
    };
  } catch {
    return {
      ok: false,
      message: `Unit "${unit}" is not valid for this value.`,
    };
  }
}
