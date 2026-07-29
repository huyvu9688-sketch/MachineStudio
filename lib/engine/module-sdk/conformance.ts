// Reusable module conformance suite (Unit 1.7). A conformant module is one that
// can be registered and executed without editing the core engine, generic UI,
// report renderer, or database schema. This runner exercises a `ModulePackage`
// through the public SDK surfaces (Unit 1.6) and reports a structured
// pass/fail/skipped result per check, so any module's test file can assert its
// package conforms and so a CI script can gate registration.
//
// The implementation-map (context/implementation-map.md Unit 1.7) lists eight
// conformance concerns; this runner covers them with four independent,
// individually-reported checks, reusing the SDK's own functions rather than
// reimplementing their rules (single source of truth):
//
//   package-validation → validateModulePackage: manifest validity, stable
//                        parameter references, generic UI/report schemas,
//                        validation-record presence, and package-hash integrity
//   import-boundary    → checkImportBoundary: pure package import boundary
//   execution          → executeModule: input/output validation, trace
//                        completeness, declared-source integrity
//   determinism        → computeIsDeterministic: pure/deterministic compute
//
// Each check is independent (one failure never blocks another) and the runner is
// pure: it takes pre-read source files rather than doing filesystem I/O, so it
// stays inside the engine-purity boundary.

import type { ParameterRegistry } from "../parameters";
import { PARAMETER_REGISTRY } from "../parameters";
import { validateModulePackage } from "./validate";
import { computeIsDeterministic, executeModule, resolveModuleInput } from "./execute";
import { ENGINE_SDK_VERSION } from "./sdk";
import type { ModulePackage } from "./types";

/** Outcome of a single conformance check. */
export type ConformanceStatus = "pass" | "fail" | "skipped";

/** The result of one conformance check. */
export interface ConformanceCheck {
  /** Stable check ID, e.g. `"package-validation"`. */
  readonly id: string;
  /** What the check verifies. */
  readonly description: string;
  /** Whether the module passed, failed, or the check could not run. */
  readonly status: ConformanceStatus;
  /** Failure or skip reason, present when not `"pass"`. */
  readonly detail?: string;
}

/** A conformance report over one module package. */
export interface ConformanceReport {
  readonly moduleId: string;
  readonly moduleVersion: string;
  /** True when no check failed (skipped checks do not fail the report). */
  readonly ok: boolean;
  readonly checks: readonly ConformanceCheck[];
}

/** A source file of a module package, for the import-boundary check. */
export interface ModuleSourceFile {
  /** Path (any form) identifying the file in messages. */
  readonly path: string;
  /** Full source text. */
  readonly contents: string;
}

/** A forbidden import found in a module's source. */
export interface ImportBoundaryViolation {
  readonly path: string;
  readonly specifier: string;
  readonly reason: string;
}

/** Options for {@link runModuleConformance}. */
export interface ConformanceOptions {
  /** Parameter registry to validate ports/values against. Defaults to the released one. */
  readonly registry?: ParameterRegistry;
  /** Running engine SDK version used for execution. Defaults to {@link ENGINE_SDK_VERSION}. */
  readonly engineSdkVersion?: string;
  /**
   * Raw inputs to feed the module. When provided, the execution and determinism
   * checks run against each; when absent, both checks are skipped.
   */
  readonly sampleInputs?: readonly unknown[];
  /**
   * Pre-read module source files. When provided, the import-boundary check runs
   * against them; when absent, it is skipped.
   */
  readonly sources?: readonly ModuleSourceFile[];
}

/**
 * Import specifiers a module package must not use. A module computes with the
 * engine's public surface only; it never reaches into persistence, auth, the UI
 * runtime, application/catalog boundaries, or Node I/O
 * (context/code-standards.md "Module Packages"; context/architecture.md
 * `lib/modules/`). This is a heuristic source scan, not a full import graph.
 */
const FORBIDDEN_IMPORTS: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  { pattern: /^@\/app(\/|$)/, reason: "application/route layer" },
  { pattern: /^@\/components(\/|$)/, reason: "UI components" },
  {
    pattern: /^@\/lib\/(db|catalog|application|reports|audit|configuration|requirements|workflows)(\/|$)/,
    reason: "non-engine library boundary",
  },
  { pattern: /^@prisma(\/|$)/, reason: "database client" },
  { pattern: /(^|[./])\.prisma(\/|$)/, reason: "generated Prisma client" },
  { pattern: /^prisma(\/|$)/, reason: "Prisma" },
  { pattern: /^@clerk(\/|$)/, reason: "authentication" },
  { pattern: /^server-only$/, reason: "server-only marker (persistence/UI concern)" },
  { pattern: /^next(\/|$)/, reason: "Next.js framework" },
  { pattern: /^react(-dom)?(\/|$)/, reason: "React UI runtime" },
  {
    pattern: /^(node:)?(fs|path|http|https|net|tls|dns|dgram|child_process|os|worker_threads|cluster)(\/|$)/,
    reason: "Node I/O builtin",
  },
];

const IMPORT_SPECIFIER_PATTERNS: readonly RegExp[] = [
  /\bfrom\s+["']([^"']+)["']/g, // import ... from "x" / export ... from "x"
  /\bimport\s+["']([^"']+)["']/g, // side-effect import "x"
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, // dynamic import("x")
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g, // require("x")
];

/** Extracts the distinct module specifiers imported by a source file. */
function extractImportSpecifiers(contents: string): string[] {
  const found = new Set<string>();
  for (const pattern of IMPORT_SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(contents)) !== null) {
      found.add(match[1]);
    }
  }
  return [...found];
}

/**
 * Scans pre-read module sources for imports that cross the module boundary. A
 * pure analyzer (no filesystem access) so it can run inside the engine.
 */
export function checkImportBoundary(
  sources: readonly ModuleSourceFile[],
): ImportBoundaryViolation[] {
  const violations: ImportBoundaryViolation[] = [];
  for (const file of sources) {
    for (const specifier of extractImportSpecifiers(file.contents)) {
      const hit = FORBIDDEN_IMPORTS.find((f) => f.pattern.test(specifier));
      if (hit !== undefined) {
        violations.push({ path: file.path, specifier, reason: hit.reason });
      }
    }
  }
  return violations;
}

/** Runs `fn`, returning a passing or failing check depending on whether it throws. */
function runCheck(id: string, description: string, fn: () => void): ConformanceCheck {
  try {
    fn();
    return { id, description, status: "pass" };
  } catch (error) {
    return {
      id,
      description,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/** A skipped check with a reason. */
function skipped(id: string, description: string, detail: string): ConformanceCheck {
  return { id, description, status: "skipped", detail };
}

/**
 * Runs the conformance suite over `pkg` and returns a structured report. Never
 * throws for a non-conforming module — every failure is captured as a failing
 * check so a caller can report all of them at once.
 */
export function runModuleConformance(
  pkg: ModulePackage,
  options: ConformanceOptions = {},
): ConformanceReport {
  const registry = options.registry ?? PARAMETER_REGISTRY;
  const engineSdkVersion = options.engineSdkVersion ?? ENGINE_SDK_VERSION;
  const checks: ConformanceCheck[] = [];

  checks.push(
    runCheck(
      "package-validation",
      "Manifest, ports, parameter references, UI/report schemas, validation record, and content hash are valid.",
      () => validateModulePackage(pkg, registry),
    ),
  );

  if (options.sources !== undefined && options.sources.length > 0) {
    const sources = options.sources;
    checks.push(
      runCheck(
        "import-boundary",
        "Module sources import only the permitted engine boundaries.",
        () => {
          const violations = checkImportBoundary(sources);
          if (violations.length > 0) {
            throw new Error(
              violations
                .map((v) => `${v.path}: "${v.specifier}" (${v.reason})`)
                .join("; "),
            );
          }
        },
      ),
    );
  } else {
    checks.push(
      skipped(
        "import-boundary",
        "Module sources import only the permitted engine boundaries.",
        "no source files provided",
      ),
    );
  }

  const samples = options.sampleInputs ?? [];
  if (samples.length > 0) {
    checks.push(
      runCheck(
        "execution",
        "Every sample input executes: inputs/outputs validate, the trace is complete, and cited sources are declared.",
        () => {
          for (const input of samples) {
            executeModule(pkg, input, { registry, engineSdkVersion });
          }
        },
      ),
    );
    checks.push(
      runCheck(
        "determinism",
        "Compute returns identical outputs across repeated runs on the same input.",
        () => {
          for (const input of samples) {
            const resolved = resolveModuleInput(pkg, input, { registry });
            if (!computeIsDeterministic(pkg, resolved)) {
              throw new Error("compute produced different outputs across runs");
            }
          }
        },
      ),
    );
  } else {
    checks.push(
      skipped(
        "execution",
        "Every sample input executes: inputs/outputs validate, the trace is complete, and cited sources are declared.",
        "no sample inputs provided",
      ),
    );
    checks.push(
      skipped(
        "determinism",
        "Compute returns identical outputs across repeated runs on the same input.",
        "no sample inputs provided",
      ),
    );
  }

  return {
    moduleId: pkg.manifest.id,
    moduleVersion: pkg.manifest.version,
    ok: checks.every((c) => c.status !== "fail"),
    checks,
  };
}
