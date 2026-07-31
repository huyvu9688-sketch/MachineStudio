import { describe, expect, it } from "vitest";
import { generateModuleScaffold } from "./scaffold";

describe("generateModuleScaffold", () => {
  it("generates the full placeholder file set under lib/modules/<id>/<version>/", () => {
    const result = generateModuleScaffold({ moduleId: "ball-screw" });
    expect(result.moduleDir).toBe("lib/modules/ball-screw/0.1.0");
    const names = result.files.map((f) =>
      f.path.replace(`${result.moduleDir}/`, ""),
    );
    expect(names).toEqual([
      "manifest.ts",
      "trace.ts",
      "checks.ts",
      "compute.ts",
      "ui.ts",
      "report.ts",
      "validation.ts",
      "index.ts",
      "ball-screw.test.ts",
    ]);
  });

  it("assembles and seals the package in index.ts with a camelCase export", () => {
    const result = generateModuleScaffold({ moduleId: "ball-screw" });
    const index = result.files.find((f) => f.path.endsWith("/index.ts"));
    expect(index).toBeDefined();
    expect(index?.contents).toContain(
      "export const ballScrewModule: ModulePackage",
    );
    expect(index?.contents).toContain("sealModulePackage(");
    expect(index?.contents).toContain("export default ballScrewModule;");
  });

  it("maps placeholder ports to released parameters so a fresh scaffold conforms", () => {
    const result = generateModuleScaffold({ moduleId: "widget" });
    const manifest = result.files.find((f) => f.path.endsWith("/manifest.ts"));
    expect(manifest?.contents).toContain(
      'asParameterId("motion.axis.payload_mass")',
    );
    expect(manifest?.contents).toContain(
      'asParameterId("motion.axis.thrust_force")',
    );
    expect(manifest?.contents).toContain('parameterRegistryVersion: "1.1.0"');
    expect(manifest?.contents).not.toContain("PARAMETER_REGISTRY_VERSION");
  });

  it("records an explicitly supplied immutable registry target", () => {
    const result = generateModuleScaffold({
      moduleId: "widget",
      parameterRegistryVersion: "1.0.0",
    });
    const manifest = result.files.find((file) =>
      file.path.endsWith("/manifest.ts"),
    );
    expect(manifest?.contents).toContain('parameterRegistryVersion: "1.0.0"');
  });

  it("imports only the engine public surface in generated sources", () => {
    const result = generateModuleScaffold({ moduleId: "widget" });
    for (const file of result.files) {
      if (file.path.endsWith(".test.ts")) continue;
      const bareImports = [
        ...file.contents.matchAll(/\bfrom\s+"([^"]+)"/g),
      ].map((m) => m[1]);
      for (const specifier of bareImports) {
        const ok = specifier === "@/lib/engine" || specifier.startsWith("./");
        expect(ok, `${file.path} imports ${specifier}`).toBe(true);
      }
    }
  });

  it("honors a custom version", () => {
    const result = generateModuleScaffold({
      moduleId: "ball-screw",
      version: "1.2.0",
    });
    expect(result.moduleDir).toBe("lib/modules/ball-screw/1.2.0");
  });

  it("rejects a non-kebab-case module ID", () => {
    expect(() => generateModuleScaffold({ moduleId: "BallScrew" })).toThrow();
    expect(() => generateModuleScaffold({ moduleId: "ball_screw" })).toThrow();
    expect(() => generateModuleScaffold({ moduleId: "-ball" })).toThrow();
    expect(() => generateModuleScaffold({ moduleId: "" })).toThrow();
  });

  it("rejects a malformed version", () => {
    expect(() =>
      generateModuleScaffold({ moduleId: "ball-screw", version: "1.0" }),
    ).toThrow();
    expect(() =>
      generateModuleScaffold({
        moduleId: "ball-screw",
        parameterRegistryVersion: "current",
      }),
    ).toThrow();
  });
});
