import { describe, expect, it } from "vitest";
import { z } from "zod";
import { makeQuantity } from "../units";
import {
  ModuleInputSchema,
  ModuleManifestSchema,
  parseModuleComputation,
} from "./schemas";

const validManifest = {
  id: "m",
  version: "1.0.0",
  contentHash: "0000000000000000",
  sdkRange: { min: "1.0.0" },
  parameterRegistryVersion: "1.0.0",
  category: "test",
  tags: [],
  workflowRoles: [],
  validityEnvelopeSummary: "s",
  sourceRevisionIds: [],
};

describe("module SDK schemas", () => {
  it("accepts a well-formed manifest and rejects unknown keys (strict)", () => {
    expect(ModuleManifestSchema.safeParse(validManifest).success).toBe(true);
    expect(ModuleManifestSchema.safeParse({ ...validManifest, extra: 1 }).success).toBe(false);
  });

  it("rejects a manifest missing a required field", () => {
    const missing: Record<string, unknown> = { ...validManifest };
    delete missing.version;
    expect(ModuleManifestSchema.safeParse(missing).success).toBe(false);
  });

  it("validates a ModuleInput envelope of engineering values", () => {
    const parsed = ModuleInputSchema.parse({ values: { m: makeQuantity(1, "kg") } });
    expect(parsed.values.m.kind).toBe("quantity");
    expect(ModuleInputSchema.safeParse({ values: { m: 5 } }).success).toBe(false);
  });

  it("parses a well-formed computation and rejects a bad check status", () => {
    const out = makeQuantity(1, "N");
    const base = {
      outputs: { out },
      trace: { v: 1, sections: [] },
      checks: [],
      warnings: [],
      assumptions: [],
      validity: [],
    };
    expect(() => parseModuleComputation(base)).not.toThrow();
    expect(() =>
      parseModuleComputation({ ...base, checks: [{ id: "c", status: "nope", message: "m" }] }),
    ).toThrow(z.ZodError);
  });
});
