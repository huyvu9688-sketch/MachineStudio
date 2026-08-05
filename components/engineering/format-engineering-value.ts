import type { EngineeringValue } from "@/lib/engine";
import { convert, formatQuantity } from "@/lib/engine/units";

/** Extracted from `link-suggestion-panel.tsx` (Unit 3.4) so Unit 3.5's result panel can reuse it. */
export function trimNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * A short, generic display string for any `EngineeringValue` kind — used
 * where a value appears inline in a sentence or a compact label (a link
 * suggestion, a trace operand). Scalar quantities use `formatQuantity` so
 * the rendered magnitude always matches its unit label. Vector quantities
 * remain compact sentence/label output and use `trimNumber` after converting
 * each component.
 */
export function formatEngineeringValue(value: EngineeringValue): string {
  switch (value.kind) {
    case "quantity":
      return formatQuantity(value, { useDisplayUnit: true });
    case "enum":
      return value.value;
    case "boolean":
      return value.value ? "Yes" : "No";
    case "vector_quantity": {
      const targetUnit = value.displayUnit ?? value.unit;
      return `[${value.components
        .map((component) =>
          trimNumber(convert(component, value.unit, targetUnit)),
        )
        .join(", ")}] ${targetUnit}`;
    }
    default:
      return `(${value.kind} value)`;
  }
}
