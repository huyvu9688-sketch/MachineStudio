import { describe, expect, it } from "vitest";
import { asParameterId } from "../parameters";
import { ModuleSdkError } from "./errors";
import { makeQuantity } from "../units";
import {
  moduleSourceHash,
  packageContentHash,
  sealModulePackage,
} from "./hash";
import type { ModuleSourceFile } from "./conformance";
import { validateModulePackage } from "./validate";
import { baseCompute, baseDraft } from "./test-support";
import type { ModulePackage } from "./types";

function expectSdkError(fn: () => unknown, code: ModuleSdkError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ModuleSdkError);
    expect((error as ModuleSdkError).code).toBe(code);
    return;
  }
  throw new Error(`expected ModuleSdkError(${code})`);
}

describe("validateModulePackage", () => {
  it("accepts a well-formed, sealed package", () => {
    expect(() =>
      validateModulePackage(sealModulePackage(baseDraft())),
    ).not.toThrow();
  });

  it("rejects an invalid manifest (empty version)", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      manifest: { ...draft.manifest, version: "" },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_manifest");
  });

  it("rejects a malformed SDK range", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      manifest: { ...draft.manifest, sdkRange: { min: "not-a-version" } },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_sdk_range");
  });

  it("rejects a port referencing an unknown parameter ID", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      ports: {
        ...draft.ports,
        inputs: [
          {
            key: "mass",
            parameterId: asParameterId("does.not.exist"),
            required: true,
          },
        ],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "unknown_parameter");
  });

  it("rejects a port whose load case is not admitted by its parameter", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      ports: {
        inputs: [
          {
            key: "external_force",
            parameterId: asParameterId("motion.axis.external_force"),
            required: false,
            loadCase: "holding",
          },
        ],
        outputs: draft.ports.outputs,
      },
      uiSchema: {
        groups: [
          { id: "g", title: "G", fields: [{ portKey: "external_force" }] },
        ],
      },
    });

    expectSdkError(() => validateModulePackage(pkg), "invalid_port_load_case");
  });

  it("accepts a port whose canonical parameter admits its declared load case", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      ports: {
        inputs: [
          {
            key: "case_acceleration",
            parameterId: asParameterId("motion.axis.case_axial_acceleration"),
            required: true,
            loadCase: "emergency_stop",
          },
        ],
        outputs: draft.ports.outputs,
      },
      uiSchema: {
        groups: [
          {
            id: "g",
            title: "G",
            fields: [{ portKey: "case_acceleration" }],
          },
        ],
      },
    });

    expect(() => validateModulePackage(pkg)).not.toThrow();
  });

  it("accepts an immutable package against an explicitly compatible registry target", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      manifest: { ...draft.manifest, parameterRegistryVersion: "1.0.0" },
    });

    expect(() => validateModulePackage(pkg)).not.toThrow();
  });

  it("rejects a parameter-registry version mismatch", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      manifest: { ...draft.manifest, parameterRegistryVersion: "9.9.9" },
    });
    expectSdkError(
      () => validateModulePackage(pkg),
      "registry_version_mismatch",
    );
  });

  it("rejects duplicate input port keys", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      ports: {
        inputs: [
          {
            key: "mass",
            parameterId: asParameterId("motion.axis.payload_mass"),
            required: true,
          },
          {
            key: "mass",
            parameterId: asParameterId("motion.axis.carriage_mass"),
            required: true,
          },
        ],
        outputs: draft.ports.outputs,
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "duplicate_port_key");
  });

  it("rejects a UI field referencing an unknown input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      uiSchema: {
        groups: [{ id: "g", title: "G", fields: [{ portKey: "nope" }] }],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_ui_schema");
  });

  it("rejects a UI field's disabledWhen referencing an unknown input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      uiSchema: {
        groups: [
          {
            id: "g",
            title: "G",
            fields: [
              { portKey: "mass", disabledWhen: { portKey: "nope", equals: "x" } },
            ],
          },
        ],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_ui_schema");
  });

  it("rejects a UI field's disabledWhen referencing a non-enum input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      uiSchema: {
        groups: [
          {
            id: "g",
            title: "G",
            fields: [
              {
                portKey: "mass",
                disabledWhen: { portKey: "mass", equals: "x" },
              },
            ],
          },
        ],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_ui_schema");
  });

  it("accepts a UI field's disabledWhen referencing a declared enum input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      ports: {
        inputs: [
          ...draft.ports.inputs,
          {
            key: "orientation",
            parameterId: asParameterId("motion.axis.orientation"),
            required: false,
          },
        ],
        outputs: draft.ports.outputs,
      },
      uiSchema: {
        groups: [
          {
            id: "g",
            title: "G",
            fields: [
              { portKey: "orientation" },
              {
                portKey: "mass",
                disabledWhen: { portKey: "orientation", equals: "vertical" },
              },
            ],
          },
        ],
      },
    });

    expect(() => validateModulePackage(pkg)).not.toThrow();
  });

  it("rejects duplicate report section IDs", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      reportSchema: {
        sections: [
          { id: "dup", title: "A", include: "inputs" },
          { id: "dup", title: "B", include: "outputs" },
        ],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_report_schema");
  });

  it("rejects a catalog adapter with an empty component type", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      catalogAdapter: { componentType: "  ", requiredSpec: () => ({}) },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_catalog_adapter");
  });

  it("rejects a tampered content hash", () => {
    const sealed = sealModulePackage(baseDraft());
    const tampered: ModulePackage = {
      ...sealed,
      manifest: { ...sealed.manifest, contentHash: "0000000000000000" },
    };
    expectSdkError(
      () => validateModulePackage(tampered),
      "content_hash_mismatch",
    );
  });
});

describe("packageContentHash / sealModulePackage", () => {
  it("is deterministic and stamps a hash matching a re-computation", () => {
    const draft = baseDraft();
    const sealed = sealModulePackage(draft);
    expect(sealed.manifest.contentHash).toBe(packageContentHash(sealed));
    expect(sealModulePackage(draft).manifest.contentHash).toBe(
      sealed.manifest.contentHash,
    );
  });

  it("changes when declarative content changes", () => {
    const a = sealModulePackage(baseDraft());
    const draftB = baseDraft();
    const b = sealModulePackage({
      ...draftB,
      manifest: { ...draftB.manifest, category: "changed" },
    });
    expect(b.manifest.contentHash).not.toBe(a.manifest.contentHash);
  });

  it("does not change when compute's behavior changes but the manifest does not", () => {
    // This is the exact design gap moduleSourceHash exists to close:
    // packageContentHash cannot see into `compute`.
    const draft = baseDraft();
    const a = sealModulePackage(draft);
    const differentCompute: typeof draft.compute = () => ({
      ...baseCompute(),
      outputs: { out: makeQuantity(999, "N") },
    });
    const b = sealModulePackage({ ...draft, compute: differentCompute });
    expect(b.manifest.contentHash).toBe(a.manifest.contentHash);
  });
});

describe("moduleSourceHash", () => {
  const fileA: ModuleSourceFile = {
    path: "compute.ts",
    contents: "export const x = 1;",
  };
  const fileB: ModuleSourceFile = {
    path: "index.ts",
    contents: "export * from './compute';",
  };

  it("is deterministic and order-independent", () => {
    expect(moduleSourceHash([fileA, fileB])).toBe(
      moduleSourceHash([fileB, fileA]),
    );
  });

  it("changes when a file's contents change", () => {
    const changed: ModuleSourceFile = {
      ...fileA,
      contents: "export const x = 2;",
    };
    expect(moduleSourceHash([changed, fileB])).not.toBe(
      moduleSourceHash([fileA, fileB]),
    );
  });

  it("changes when a file is added or removed", () => {
    expect(moduleSourceHash([fileA])).not.toBe(
      moduleSourceHash([fileA, fileB]),
    );
  });

  it("changes when a file is renamed, even with identical contents", () => {
    const renamed: ModuleSourceFile = {
      path: "renamed.ts",
      contents: fileA.contents,
    };
    expect(moduleSourceHash([renamed])).not.toBe(moduleSourceHash([fileA]));
  });

  it("treats CRLF and LF line endings as equivalent", () => {
    // Regression guard, confirmed necessary by direct test: this repo checks
    // out with CRLF on Windows (core.autocrlf=true) but stores LF, so a
    // pinned hash computed on Windows must match one computed in CI (LF) for
    // the same logical content.
    const lf: ModuleSourceFile = {
      path: "compute.ts",
      contents: "line one\nline two\n",
    };
    const crlf: ModuleSourceFile = {
      path: "compute.ts",
      contents: "line one\r\nline two\r\n",
    };
    expect(moduleSourceHash([crlf])).toBe(moduleSourceHash([lf]));
  });
});
