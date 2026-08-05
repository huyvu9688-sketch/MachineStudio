// Shared test-only helper for module packages: reads a module version
// directory's own source files off disk for runModuleConformance's
// import-boundary and source-immutability checks (design-risk follow-up,
// 2026-07-30 — see context/progress-tracker.md). Node-only (fs), so this
// must never be imported by module or engine production code — only by a
// module's own `<id>.test.ts`. Not a `.test.ts` file itself, so vitest does
// not execute it directly (same convention as
// lib/engine/module-sdk/test-support.ts).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModuleSourceFile } from "@/lib/engine";

/**
 * Reads every non-test `.ts` file directly under `dir` (a module version
 * directory, typically `import.meta.dirname` from the caller), sorted by
 * name for a deterministic result.
 */
export function readModuleSources(dir: string): ModuleSourceFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => ({
      path: name,
      contents: readFileSync(join(dir, name), "utf8"),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
