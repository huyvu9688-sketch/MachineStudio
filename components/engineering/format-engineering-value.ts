import type { EngineeringValue } from "@/lib/engine";
import { convert, formatQuantity } from "@/lib/engine/units";

/** Extracted from `link-suggestion-panel.tsx` (Unit 3.4) so Unit 3.5's result panel can reuse it. */
export function trimNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * axis.v1's fixed 3-component order (context/modules/axis-load-cases/
 * stage-1-spec.md; mirrors `AXIS_COMPONENT_CAPTIONS` in
 * module-input-workspace.tsx) — the only `frame` this formatter recognizes
 * well enough to label.
 */
const AXIS_COMPONENT_CAPTIONS = ["X", "Y", "Z"] as const;

/**
 * A short, generic display string for any `EngineeringValue` kind — used
 * where a value appears inline in a sentence or a compact label (a link
 * suggestion, a trace operand). Scalar quantities use `formatQuantity` so
 * the rendered magnitude always matches its unit label. Vector quantities
 * remain compact sentence/label output and use `trimNumber` after converting
 * each component; a `frame: "axis"` vector gets its components labeled X/Y/Z
 * so it isn't just three unlabeled numbers.
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
      const isAxis = value.frame === "axis";
      return `[${value.components
        .map((component, index) => {
          const magnitude = trimNumber(
            convert(component, value.unit, targetUnit),
          );
          return isAxis
            ? `${AXIS_COMPONENT_CAPTIONS[index]}: ${magnitude}`
            : magnitude;
        })
        .join(", ")}] ${targetUnit}`;
    }
    default:
      return `(${value.kind} value)`;
  }
}
