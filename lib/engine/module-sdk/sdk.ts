// Engine SDK version and compatibility check (Unit 1.6). A released module
// declares the range of engine SDK versions it is validated against; the engine
// refuses to execute a module whose range does not include the running SDK
// version (context/architecture.md manifest "Engine SDK compatibility range";
// invariant "Stable semantics"). Semver comparison is intentionally minimal and
// dependency-free — three numeric parts, no prerelease/build metadata — which is
// sufficient for the module SDK's own versioning.

/**
 * Semantic version of the module SDK the engine currently implements. Bumped
 * when the {@link import("./types").ModulePackage} contract or execution
 * semantics change in a way modules can observe.
 *
 * 1.1.0: `executeModule`/`resolveModuleInput` now enforce a parameter's
 * declared `range` against submitted input magnitudes (previously declared
 * but never checked). Every released module declares `sdkRange: { min:
 * "1.0.0" }` with no `maxExclusive`, so this remains compatible; a module
 * whose own reference/boundary tests supplied an in-range value is
 * unaffected.
 */
export const ENGINE_SDK_VERSION = "1.1.0";

/**
 * An engine SDK compatibility range: modules validated against `min` (inclusive)
 * up to but not including `maxExclusive` (when present). A module with no
 * `maxExclusive` is open-ended above `min`.
 */
export interface SdkRange {
  readonly min: string;
  readonly maxExclusive?: string;
}

/** Parses `"x.y.z"` into a numeric triple, or `undefined` when malformed. */
export function parseSemver(
  version: string,
): readonly [number, number, number] | undefined {
  const parts = version.split(".");
  if (parts.length !== 3) return undefined;
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => Number.isNaN(n))) return undefined;
  return [nums[0], nums[1], nums[2]] as const;
}

/** True when `version` is a well-formed `"x.y.z"` semantic version. */
export function isValidSemver(version: string): boolean {
  return parseSemver(version) !== undefined;
}

/**
 * Compares two semantic versions, returning -1, 0, or 1.
 *
 * @throws {RangeError} when either version is malformed.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa === undefined || pb === undefined) {
    throw new RangeError(
      `Malformed semantic version in compare("${a}", "${b}").`,
    );
  }
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

/** True when `range` is well-formed: `min` valid, `maxExclusive` valid and above `min`. */
export function isValidSdkRange(range: SdkRange): boolean {
  if (!isValidSemver(range.min)) return false;
  if (range.maxExclusive === undefined) return true;
  return (
    isValidSemver(range.maxExclusive) &&
    compareSemver(range.min, range.maxExclusive) < 0
  );
}

/**
 * True when `engineVersion` falls within `range`: at or above `min` and, when a
 * `maxExclusive` is given, strictly below it. A malformed range is never
 * compatible.
 */
export function isSdkCompatible(
  range: SdkRange,
  engineVersion: string = ENGINE_SDK_VERSION,
): boolean {
  if (!isValidSdkRange(range) || !isValidSemver(engineVersion)) return false;
  if (compareSemver(engineVersion, range.min) < 0) return false;
  if (
    range.maxExclusive !== undefined &&
    compareSemver(engineVersion, range.maxExclusive) >= 0
  ) {
    return false;
  }
  return true;
}
