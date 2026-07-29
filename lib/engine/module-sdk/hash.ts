// Deterministic content hash for a module package (Unit 1.6; roadmap module
// definition of done "package hash"). The hash covers the package's declarative
// contract — manifest (excluding the hash field itself), ports, UI schema,
// report schema, validation record, and the catalog adapter's component type. It
// deliberately excludes behavior (the `compute` function, the author-provided
// `inputSchema`, the adapter's `requiredSpec`), which is not stably
// serializable. The hash is stamped onto the manifest at release
// (`sealModulePackage`) and stored on every calculation run so a run records the
// exact package it executed (context/architecture.md "Released package hashes
// stored on runs"). Reuses the parameter registry's dependency-free hash.

import { contentHash, stableStringify } from "../parameters";
import type {
  CatalogAdapter,
  ModuleManifest,
  ModulePackage,
  ModulePackageDraft,
  ModulePorts,
  ModuleReportSchema,
  ModuleUiSchema,
  ValidationRecord,
} from "./types";

/** The declarative parts of a package the content hash covers. */
interface HashablePackage {
  readonly manifest: Omit<ModuleManifest, "contentHash">;
  readonly ports: ModulePorts;
  readonly uiSchema: ModuleUiSchema;
  readonly reportSchema: ModuleReportSchema;
  readonly validation: ValidationRecord;
  readonly catalogAdapter?: Pick<CatalogAdapter, "componentType">;
}

/** Returns the manifest without its `contentHash` field (runtime-safe strip). */
function manifestWithoutHash(
  manifest: Omit<ModuleManifest, "contentHash">,
): Omit<ModuleManifest, "contentHash"> {
  const clone = { ...manifest } as Record<string, unknown>;
  delete clone.contentHash;
  return clone as unknown as Omit<ModuleManifest, "contentHash">;
}

/**
 * A stable 16-hex-character content fingerprint of a module package's
 * declarative contract. Excludes the manifest's own `contentHash`, so hashing a
 * sealed package reproduces the stamped value.
 */
export function packageContentHash(pkg: HashablePackage): string {
  const projection = {
    manifest: manifestWithoutHash(pkg.manifest),
    ports: pkg.ports,
    uiSchema: pkg.uiSchema,
    reportSchema: pkg.reportSchema,
    validation: pkg.validation,
    catalogAdapter:
      pkg.catalogAdapter === undefined
        ? undefined
        : { componentType: pkg.catalogAdapter.componentType },
  };
  return contentHash(stableStringify(projection));
}

/**
 * Seals a {@link ModulePackageDraft} into a released {@link ModulePackage} by
 * computing its content hash and stamping it onto the manifest. This is the
 * release step (context/ai-workflow-rules.md Stage 6 "freeze content hash").
 */
export function sealModulePackage(draft: ModulePackageDraft): ModulePackage {
  return {
    ...draft,
    manifest: { ...draft.manifest, contentHash: packageContentHash(draft) },
  };
}
