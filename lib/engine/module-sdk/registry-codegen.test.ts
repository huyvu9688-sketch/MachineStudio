import { describe, expect, it } from "vitest";
import {
  generateRegistrySource,
  moduleRegistryKey,
  type RegistryModuleEntry,
} from "./registry-codegen";

describe("moduleRegistryKey", () => {
  it("keys a module by id@version", () => {
    expect(moduleRegistryKey("ball-screw", "1.0.0")).toBe("ball-screw@1.0.0");
  });
});

describe("generateRegistrySource", () => {
  it("emits an empty registry with no module imports", () => {
    const source = generateRegistrySource([]);
    expect(source).toContain("GENERATED FILE");
    expect(source).toContain(
      "export const MODULE_REGISTRY: Readonly<Record<string, ModulePackage>> = {};",
    );
    expect(source).not.toContain('from "./');
  });

  it("emits an import and a keyed entry per module", () => {
    const entries: RegistryModuleEntry[] = [
      {
        moduleId: "ball-screw",
        version: "1.0.0",
        importPath: "./ball-screw/1.0.0",
      },
    ];
    const source = generateRegistrySource(entries);
    expect(source).toContain(
      'import mod_ball_screw_1_0_0 from "./ball-screw/1.0.0";',
    );
    expect(source).toContain('"ball-screw@1.0.0": mod_ball_screw_1_0_0,');
  });

  it("produces a unique import identifier per module and version", () => {
    const entries: RegistryModuleEntry[] = [
      {
        moduleId: "ball-screw",
        version: "1.0.0",
        importPath: "./ball-screw/1.0.0",
      },
      {
        moduleId: "ball-screw",
        version: "2.0.0",
        importPath: "./ball-screw/2.0.0",
      },
    ];
    const source = generateRegistrySource(entries);
    expect(source).toContain("mod_ball_screw_1_0_0");
    expect(source).toContain("mod_ball_screw_2_0_0");
  });
});
