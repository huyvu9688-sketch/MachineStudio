// CLI: regenerate the compile-time module registry (Unit 1.7).
//
//   npm run registry:generate
//
// Scans lib/modules/<module-id>/<version>/index.ts and writes
// lib/modules/registry.generated.ts — a keyed record of every module package.
// Run it after adding, versioning, or removing a module.
//
// Runs under Node's native TypeScript execution (Node >= 26). It imports the
// pure code generator directly (that module has no runtime imports) and does
// the filesystem scan/write here.

import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateRegistrySource,
  type RegistryModuleEntry,
} from "../lib/engine/module-sdk/registry-codegen.ts";

function subdirectories(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) =>
    statSync(join(dir, name)).isDirectory(),
  );
}

function main(): void {
  const modulesDir = join(process.cwd(), "lib", "modules");
  const entries: RegistryModuleEntry[] = [];

  for (const moduleId of subdirectories(modulesDir)) {
    for (const version of subdirectories(join(modulesDir, moduleId))) {
      const indexPath = join(modulesDir, moduleId, version, "index.ts");
      if (existsSync(indexPath)) {
        entries.push({
          moduleId,
          version,
          importPath: `./${moduleId}/${version}`,
        });
      }
    }
  }

  entries.sort((a, b) =>
    a.moduleId === b.moduleId
      ? a.version.localeCompare(b.version)
      : a.moduleId.localeCompare(b.moduleId),
  );

  const outPath = join(modulesDir, "registry.generated.ts");
  writeFileSync(outPath, generateRegistrySource(entries), "utf8");

  console.log(
    `Wrote ${entries.length} module(s) to lib/modules/registry.generated.ts:`,
  );
  for (const entry of entries) {
    console.log(`  - ${entry.moduleId}@${entry.version}`);
  }
}

main();
