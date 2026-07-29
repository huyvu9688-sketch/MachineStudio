// CLI: scaffold a new module package (Unit 1.7).
//
//   npm run module:new -- <module-id> [version]
//
// Generates lib/modules/<module-id>/<version>/ with manifest, compute, trace,
// checks, UI, report, validation, an assembling index, and a conformance test.
// The generated scaffold compiles and passes the conformance suite immediately;
// replace the TODO markers with the real engineering, then run
// `npm run registry:generate`.
//
// Runs under Node's native TypeScript execution (Node >= 26). It imports the
// pure generator directly (that module has no runtime imports) and does the
// filesystem writes here.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { generateModuleScaffold } from "../lib/engine/module-sdk/scaffold.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const [moduleId, version] = process.argv.slice(2);
  if (moduleId === undefined || moduleId.startsWith("-")) {
    fail("Usage: npm run module:new -- <module-id> [version]");
  }

  let result;
  try {
    result = generateModuleScaffold({ moduleId, version });
  } catch (error) {
    fail(`Scaffold error: ${error instanceof Error ? error.message : String(error)}`);
  }

  const repoRoot = process.cwd();
  const absDir = join(repoRoot, result.moduleDir);
  if (existsSync(absDir)) {
    fail(`Refusing to overwrite existing directory: ${result.moduleDir}`);
  }

  for (const file of result.files) {
    const abs = join(repoRoot, file.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, file.contents, "utf8");
  }

  console.log(`Scaffolded module "${result.moduleId}@${result.version}":`);
  for (const file of result.files) console.log(`  + ${file.path}`);
  console.log(
    "Next: implement the compute + validation record, then run `npm run registry:generate`.",
  );
}

main();
