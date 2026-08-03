import { convert, makeQuantity } from "@/lib/engine/units";
import type { Quantity } from "@/lib/engine/values";

export type SubmittedQuantityParseResult =
  | { readonly ok: true; readonly value: Quantity }
  | { readonly ok: false; readonly message: string };

export function parseSubmittedQuantity(
  rawMagnitude: string,
  rawUnit: string,
  canonicalUnit: string,
): SubmittedQuantityParseResult {
  const magnitudeText = rawMagnitude.trim();
  if (magnitudeText.length === 0) {
    return { ok: false, message: "Enter a numeric value." };
  }

  const magnitude = Number(magnitudeText);
  if (!Number.isFinite(magnitude)) {
    return { ok: false, message: "Enter a numeric value." };
  }

  const unit = rawUnit || canonicalUnit;
  try {
    return {
      ok: true,
      value: makeQuantity(
        convert(magnitude, unit, canonicalUnit),
        canonicalUnit,
        unit,
      ),
    };
  } catch {
    return {
      ok: false,
      message: `Unit "${unit}" is not valid for this value.`,
    };
  }
}
