import { describe, expect, it } from "vitest";
import { convert, makeQuantity } from "@/lib/engine/units";
import { engineeringValuesClose } from "@/lib/engine/values";
import { parseSubmittedQuantity } from "./parse-submitted-quantity";

describe("parseSubmittedQuantity", () => {
  it.each(["", "   "])(
    "rejects a blank magnitude %j before numeric coercion",
    (rawMagnitude) => {
      expect(parseSubmittedQuantity(rawMagnitude, "mm", "m")).toEqual({
        ok: false,
        message: "Enter a numeric value.",
      });
    },
  );

  it("preserves a typed zero as a canonical zero quantity", () => {
    expect(parseSubmittedQuantity("0", "mm", "m")).toMatchObject({
      ok: true,
      value: { kind: "quantity", value: 0, unit: "m", displayUnit: "mm" },
    });
  });

  it("converts a non-canonical submitted magnitude into the canonical unit", () => {
    expect(parseSubmittedQuantity("500", "mm", "m")).toMatchObject({
      ok: true,
      value: { kind: "quantity", value: 0.5, unit: "m", displayUnit: "mm" },
    });
  });

  it("uses the canonical unit when the submitted unit is empty", () => {
    expect(parseSubmittedQuantity("2.5", "", "m")).toMatchObject({
      ok: true,
      value: { kind: "quantity", value: 2.5, unit: "m", displayUnit: "m" },
    });
  });

  it.each([
    [0.5, "m", "mm"],
    [298.15, "K", "degC"],
  ])(
    "preserves canonical %f %s and its display unit through ten unchanged saves in %s",
    (canonicalMagnitude, canonicalUnit, displayUnit) => {
      const expected = makeQuantity(
        canonicalMagnitude,
        canonicalUnit,
        displayUnit,
      );
      let actual = expected;

      for (let save = 0; save < 10; save += 1) {
        const displayMagnitude = convert(
          actual.value,
          actual.unit,
          displayUnit,
        );
        const parsed = parseSubmittedQuantity(
          String(displayMagnitude),
          displayUnit,
          canonicalUnit,
        );

        expect(parsed).toMatchObject({ ok: true });
        if (!parsed.ok) {
          throw new Error(parsed.message);
        }
        actual = parsed.value;
      }

      expect(engineeringValuesClose(actual, expected)).toBe(true);
      expect(actual.displayUnit).toBe(displayUnit);
    },
  );
});
