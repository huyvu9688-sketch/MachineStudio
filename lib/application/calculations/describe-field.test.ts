// Pure tests for `describeField` — no live database, no `describe.skipIf`,
// no dynamic imports. `describe-field.ts` has zero `@/lib/db` exposure (its
// only import is type-only), and `@/lib/engine` itself imports nothing from
// `@/lib/db` (context/architecture.md's boundary invariant), so this file is
// safe to import at the top level like any ordinary unit test.

import { describe, expect, it } from "vitest";
import { getParameter } from "@/lib/engine";
import { describeField } from "./describe-field";

describe("describeField", () => {
  it("describes the real released motion.axis.external_force as an axis-frame vector_quantity field", () => {
    const definition = getParameter("motion.axis.external_force");
    if (definition === undefined) {
      throw new Error("motion.axis.external_force must be registered");
    }

    const descriptor = describeField(definition.valueType, definition);

    expect(descriptor).toEqual({
      kind: "vector_quantity",
      canonicalUnit: "N",
      displayUnits: ["N", "kN", "lbf"],
      frame: "axis",
    });
  });

  it("keeps a non-axis-frame vector_quantity parameter unsupported", () => {
    const descriptor = describeField("vector_quantity", {
      canonicalUnit: "N",
      displayUnits: ["N"],
      frame: "world",
    });

    expect(descriptor).toEqual({
      kind: "unsupported",
      valueType: "vector_quantity",
    });
  });
});
