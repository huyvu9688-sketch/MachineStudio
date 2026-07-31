import type { EngineeringValue } from "@/lib/engine";

/** Extracted from `link-suggestion-panel.tsx` (Unit 3.4) so Unit 3.5's result panel can reuse it. */
export function trimNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * A short, generic display string for any `EngineeringValue` kind — used
 * where a value appears inline in a sentence or a compact label (a link
 * suggestion, a trace operand). `module-result-panel.tsx`'s tabular cells use
 * `formatQuantity` (`lib/engine/units`) instead for `quantity` values, since
 * a table is exactly the "engineering table" `ui-context.md` "Tables and
 * Numeric Inputs" asks to show proper significant figures for; this function
 * keeps its original fixed-3-decimal behavior for the sentence/label contexts
 * it already shipped in.
 */
export function formatEngineeringValue(value: EngineeringValue): string {
  switch (value.kind) {
    case "quantity":
      return `${trimNumber(value.value)} ${value.displayUnit ?? value.unit}`;
    case "enum":
      return value.value;
    case "boolean":
      return value.value ? "Yes" : "No";
    case "vector_quantity":
      return `[${value.components.map(trimNumber).join(", ")}] ${value.displayUnit ?? value.unit}`;
    default:
      return `(${value.kind} value)`;
  }
}
