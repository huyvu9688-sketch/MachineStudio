// Picker-list helpers for the "Add module" dialog's module-package options
// (page.tsx). Split out from page.tsx (a thin route handler that otherwise
// transitively pulls in lib/db, which needs a live DATABASE_URL even for a
// pure data-shaping unit test) so `latestVersionOnly` stays independently
// testable.
import type { ModulePackageOption } from "@/components/engineering/add-module-instance-dialog";

/**
 * Compares two `major.minor.patch` semantic versions, ascending. Every
 * registered module version in this codebase is a plain numeric semver (no
 * prerelease/build tags), so a per-segment numeric compare is exact — this
 * does not need a general-purpose semver library.
 */
export function compareModuleVersions(a: string, b: string): number {
  const [aParts, bParts] = [a, b].map((version) =>
    version.split(".").map((segment) => Number(segment)),
  );
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/**
 * Keeps only the newest registered version of each module id. Older
 * released versions stay registered and immutable (existing instances keep
 * running whichever version they were created with — nothing about this
 * touches the registry itself), but offering every one of them as a
 * separate "Add module" option produced confusing duplicate entries (e.g.
 * `pneumatic-cylinder-sizing@0.1.0` and `@0.1.1` both listed under
 * "Pneumatic Selection" with the same friendly name) once a module
 * accumulated more than one released version.
 */
export function latestVersionOnly(
  packages: readonly ModulePackageOption[],
): readonly ModulePackageOption[] {
  const newestById = new Map<string, ModulePackageOption>();
  for (const pkg of packages) {
    const existing = newestById.get(pkg.modulePackageId);
    if (
      existing === undefined ||
      compareModuleVersions(pkg.moduleVersion, existing.moduleVersion) > 0
    ) {
      newestById.set(pkg.modulePackageId, pkg);
    }
  }
  return packages.filter(
    (pkg) => newestById.get(pkg.modulePackageId) === pkg,
  );
}
