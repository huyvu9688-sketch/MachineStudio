import { describe, expect, it } from "vitest";
import {
  moduleRegistryKey,
  runModuleConformance,
  validateModulePackage,
} from "@/lib/engine";
import { MODULE_REGISTRY, getModulePackage } from ".";

// Proves the Unit 1.7 exit criterion end to end: a module scaffolded with
// `npm run module:new` (here, example-scaffold) registers through the generated
// registry and passes validation + conformance without any core-engine, generic
// UI, report-renderer, or database-schema change.
describe("MODULE_REGISTRY", () => {
  const entries = Object.entries(MODULE_REGISTRY);

  it("includes the scaffolded example module", () => {
    expect(getModulePackage("example-scaffold", "0.1.0")).toBeDefined();
  });

  for (const [key, pkg] of entries) {
    describe(key, () => {
      it("is keyed by its manifest id@version", () => {
        expect(key).toBe(moduleRegistryKey(pkg.manifest.id, pkg.manifest.version));
      });

      it("validates as a registrable package", () => {
        expect(() => validateModulePackage(pkg)).not.toThrow();
      });

      it("passes conformance", () => {
        const report = runModuleConformance(pkg);
        expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      });
    });
  }
});
