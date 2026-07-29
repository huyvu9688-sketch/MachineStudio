import { describe, expect, it } from "vitest";
import { asParameterId } from "../parameters";
import { ModuleSdkError } from "./errors";
import { packageContentHash, sealModulePackage } from "./hash";
import { validateModulePackage } from "./validate";
import { baseDraft } from "./test-support";
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
    expect(() => validateModulePackage(sealModulePackage(baseDraft()))).not.toThrow();
  });

  it("rejects an invalid manifest (empty version)", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({ ...draft, manifest: { ...draft.manifest, version: "" } });
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
        inputs: [{ key: "mass", parameterId: asParameterId("does.not.exist"), required: true }],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "unknown_parameter");
  });

  it("rejects a parameter-registry version mismatch", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      manifest: { ...draft.manifest, parameterRegistryVersion: "9.9.9" },
    });
    expectSdkError(() => validateModulePackage(pkg), "registry_version_mismatch");
  });

  it("rejects duplicate input port keys", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      ports: {
        inputs: [
          { key: "mass", parameterId: asParameterId("motion.axis.payload_mass"), required: true },
          { key: "mass", parameterId: asParameterId("motion.axis.carriage_mass"), required: true },
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
      uiSchema: { groups: [{ id: "g", title: "G", fields: [{ portKey: "nope" }] }] },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_ui_schema");
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
    expectSdkError(() => validateModulePackage(tampered), "content_hash_mismatch");
  });
});

describe("packageContentHash / sealModulePackage", () => {
  it("is deterministic and stamps a hash matching a re-computation", () => {
    const draft = baseDraft();
    const sealed = sealModulePackage(draft);
    expect(sealed.manifest.contentHash).toBe(packageContentHash(sealed));
    expect(sealModulePackage(draft).manifest.contentHash).toBe(sealed.manifest.contentHash);
  });

  it("changes when declarative content changes", () => {
    const a = sealModulePackage(baseDraft());
    const draftB = baseDraft();
    const b = sealModulePackage({ ...draftB, manifest: { ...draftB.manifest, category: "changed" } });
    expect(b.manifest.contentHash).not.toBe(a.manifest.contentHash);
  });
});
