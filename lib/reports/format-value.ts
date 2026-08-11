// Formats an `EngineeringValue` for report display. Duplicated from
// `components/engineering/format-engineering-value.ts` rather than imported:
// architecture.md's UI boundary runs one direction only (components/ and
// app/ depend on lib/, never the reverse), so lib/reports cannot reach into
// components/. Both copies convert through `lib/engine/units`, never
// reimplementing a unit conversion of their own (code-standards.md "Display-
// unit conversion occurs only through the unit package").

import type { EngineeringValue } from "@/lib/engine";
import { convert, formatQuantity } from "@/lib/engine/units";

function trimNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/** axis.v1's fixed 3-component order — the only `frame` this formatter recognizes well enough to label. */
const AXIS_COMPONENT_CAPTIONS = ["X", "Y", "Z"] as const;

/** A short, generic display string for any `EngineeringValue` kind. */
export function formatReportValue(value: EngineeringValue): string {
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
