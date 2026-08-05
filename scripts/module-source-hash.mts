// CLI: print a module version's source-immutability hash (design-risk
// follow-up, 2026-07-30 — see context/progress-tracker.md).
//
//   npm run module:source-hash -- <module-id> <version>
//
// Reads every non-test .ts file directly under
// lib/modules/<module-id>/<version>/ and prints the hash
// runModuleConformance's "source-immutability" check expects as
// `expectedSourceHash`, plus a ready-to-paste `sources` array. Run this after
// a deliberate change to a module's implementation files and paste the new
// hash into that module's own <id>.test.ts — the same "pinned fixture"
// pattern lib/engine/parameters/hash.ts already uses for the parameter
// registry. An unreviewed edit leaves the pinned value stale, which is what
// makes the conformance check fail.
//
// Runs under Node's native TypeScript execution (Node >= 26). It imports the
// pure hash function directly (no runtime imports) and does the filesystem
// read here — module code itself cannot do this (code-standards.md "Module
// Packages": no file storage imports).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { moduleSourceHash } from "../lib/engine/module-sdk/hash.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const [moduleId, version] = process.argv.slice(2);
  if (moduleId === undefined || version === undefined) {
    fail("Usage: npm run module:source-hash -- <module-id> <version>");
  }

  const moduleDir = join(process.cwd(), "lib", "modules", moduleId, version);
  if (!statSync(moduleDir, { throwIfNoEntry: false })?.isDirectory()) {
    fail(`No such module directory: lib/modules/${moduleId}/${version}`);
  }

  const names = readdirSync(moduleDir).filter(
    (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
  );
  if (names.length === 0) {
    fail(`No .ts source files found in lib/modules/${moduleId}/${version}`);
  }

  const sources = names
    .map((name) => ({
      path: name,
      contents: readFileSync(join(moduleDir, name), "utf8"),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const hash = moduleSourceHash(sources);

  console.log(`Source files (${sources.length}):`);
  for (const file of sources) console.log(`  - ${file.path}`);
  console.log("");
  console.log(`expectedSourceHash: "${hash}"`);
}

main();
