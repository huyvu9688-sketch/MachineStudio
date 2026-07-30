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

// Imports the specific file, not the "../parameters" barrel: this module
// must stay importable under Node's native TypeScript execution (no
// bundler), which cannot resolve a directory/barrel specifier — see
// scripts/module-source-hash.mts, confirmed by direct test (the barrel
// import raised Node's ERR_UNSUPPORTED_DIR_IMPORT there).
import { contentHash, stableStringify } from "../parameters/hash.ts";
import type { ModuleSourceFile } from "./conformance";
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

/**
 * A stable content hash over a module version's actual source files —
 * exactly what {@link packageContentHash} excludes (`compute` and its
 * helpers are not stably serializable). This closes the design gap
 * `packageContentHash`'s own top comment names: two packages with
 * identical manifests but different formulas hash the same, so a run's
 * pinned `contentHash` cannot by itself prove which formula executed.
 *
 * Order-independent (sorted by `path`) and line-ending-independent
 * (`\r\n`/`\r` normalized to `\n` before hashing) — confirmed necessary by
 * direct test: this repository checks out with CRLF on Windows
 * (`core.autocrlf=true`) but stores (and CI checks out) LF, so an
 * un-normalized hash of raw `readFileSync` bytes computed on Windows would
 * never match the same content re-hashed in CI.
 *
 * Pure — like `packageContentHash`, it takes already-read file contents
 * rather than doing filesystem I/O, so it stays inside the engine-purity
 * boundary; module code itself cannot read its own source files
 * (`code-standards.md` "Module Packages": module code cannot import file
 * storage), so the actual `fs.readFileSync` calls belong in a script or a
 * test file, never in the module package itself. See
 * `scripts/module-source-hash.mts` and
 * `runModuleConformance`'s `source-immutability` check
 * (`./conformance.ts`), which is what actually uses this at test time.
 */
export function moduleSourceHash(sources: readonly ModuleSourceFile[]): string {
  const normalized = sources.map((file) => ({
    path: file.path,
    contents: file.contents.replace(/\r\n?/g, "\n"),
  }));
  const sorted = normalized.sort((a, b) => a.path.localeCompare(b.path));
  return contentHash(stableStringify(sorted));
}
